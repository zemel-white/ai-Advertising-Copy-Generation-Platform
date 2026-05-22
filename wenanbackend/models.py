import os
import re
import json
from typing import List, Optional
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# ========== Kimi API 客户端 ==========
client = OpenAI(

)

# ========== ChatGLM 模型全局缓存 ==========
_chatglm_model = None
_chatglm_tokenizer = None

def _load_chatglm():
    """懒加载 ChatGLM 模型（单例），首次调用时加载，后续复用"""
    global _chatglm_model, _chatglm_tokenizer
    if _chatglm_model is not None:
        return _chatglm_model, _chatglm_tokenizer

    from transformers import AutoModel, AutoTokenizer

    # 优先加载 LoRA 微调 checkpoint，若无有效权重则回退到基座模型
    lora_path = os.path.join(
        os.path.dirname(__file__),
        "chatglm/finetune_demo/output/checkpoint-10000"
    )
    adapter_file = os.path.join(lora_path, "adapter_model.safetensors")
    if os.path.isfile(adapter_file) and os.path.getsize(adapter_file) > 0:
        # 有训练好的 LoRA 权重 — 用 PEFT 加载
        from peft import AutoPeftModelForCausalLM
        print(f"[ChatGLM] 加载 LoRA 微调模型: {lora_path}")
        _chatglm_model = AutoPeftModelForCausalLM.from_pretrained(
            lora_path, trust_remote_code=True, device_map="auto"
        )
        tokenizer_dir = _chatglm_model.peft_config['default'].base_model_name_or_path
        _chatglm_tokenizer = AutoTokenizer.from_pretrained(
            tokenizer_dir, trust_remote_code=True
        )
    else:
        # 无 LoRA 权重 → 加载基座模型
        base_model = "THUDM/chatglm3-6b"
        print(f"[ChatGLM] 加载基座模型: {base_model}")
        _chatglm_model = AutoModel.from_pretrained(
            base_model, trust_remote_code=True, device_map="auto"
        ).eval()
        _chatglm_tokenizer = AutoTokenizer.from_pretrained(
            base_model, trust_remote_code=True
        )

    return _chatglm_model, _chatglm_tokenizer


def chatglm_generate(prompt: str, system_prompt: str = "") -> str:
    """调用 ChatGLM 生成文本"""
    model, tokenizer = _load_chatglm()
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})
    response, _ = model.chat(tokenizer, messages)
    return response


# --- 输入模型 ---
class CopywritingRequest(BaseModel):
    product: str
    target: str
    style: str = "professional"
    length: str = "medium"
    language: str = "zh"
    platform: str = "douyin"
    description: Optional[str] = ""
    reference_content: Optional[str] = ""
    base_copy: Optional[str] = None
    model: str = "kimi"  # 可选: "kimi" | "chatglm"

# --- 输出模型 ---
class GeneratedResponse(BaseModel):
    copies: List[str]
    model: str

# --- 业务逻辑函数 ---
async def fetch_kimi_copy(data: CopywritingRequest) -> List[str]:
    """封装调用 Kimi 的核心逻辑"""
    # 长度配置：(最小字数, 最大字数, 提示用语, 补充约束)
    LENGTH_PRESETS = {
        "short":    (15, 25, "请确保每条文案有 15~25 个字"),
        "medium":   (25, 60, "请确保每条文案有 25~60 个字"),
        "long":     (60, 220, "请确保每条文案有 60~200 个字"),
        "extra-long": (200, 500, "请确保每条文案有 200 字以上"),
    }
    min_len, max_len, length_rule = LENGTH_PRESETS.get(data.length, (15, 60, ""))

    # 句子数量提示（辅助模型控制长度）
    SENTENCE_HINTS = {
        "short":    "用 1 句话完成",
        "medium":   "用 2~3 句话完成",
        "long":     "用 3~6 句话完成",
        "extra-long": "请充分展开描述，用 6 句话以上完成",
    }
    sentence_hint = SENTENCE_HINTS.get(data.length, "")

    prompt_text = _build_copywriting_prompt(data, sentence_hint, length_rule)

    system_prompt = f"你是电商文案专家。{length_rule}，{sentence_hint}。每条输出前后不要带多余文字。"

    if data.model == "chatglm":
        content = chatglm_generate(prompt_text, system_prompt)
    else:
        completion = client.chat.completions.create(
            model="moonshot-v1-8k",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt_text}
            ],
            temperature=0.7,
        )
        content = completion.choices[0].message.content

    # 后处理：清洗 → 按字数严格过滤 → 无回退
    raw_lines = [line.strip() for line in content.split('\n') if line.strip()]
    results = []
    for line in raw_lines:
        cleaned = line.lstrip("0123456789.-*#·•、·—\"").strip("\"'「」『』【】（）()").strip()
        if len(cleaned) < 4:
            continue
        if min_len <= len(cleaned) <= max_len:
            results.append(cleaned)

    # 如果严格过滤后为空，再试一次：只放宽下限（降低期望但不接受过短的垃圾内容）
    if not results:
        relaxed_min = max(4, min_len - 10)
        for line in raw_lines:
            cleaned = line.lstrip("0123456789.-*#·•、·—\"").strip("\"'「」『』【】（）()").strip()
            if len(cleaned) < 4:
                continue
            if relaxed_min <= len(cleaned) <= max_len + 50:
                results.append(cleaned)

    return results


def _build_copywriting_prompt(data: CopywritingRequest, sentence_hint: str, length_rule: str) -> str:
    """构造文案生成的 user prompt"""
    parts = [f"""你是一位专业的电商营销文案专家。请为以下产品创作文案：
- 产品名称：{data.product}
- 目标受众：{data.target}
- 投放平台：{data.platform}
- 文案风格：{data.style}"""]

    if data.description:
        parts.append(f"- 附加描述：{data.description}")
    if data.reference_content:
        parts.append(f"- 参考背景信息：{data.reference_content}")
    if data.base_copy:
        parts.append(f"- 请基于此原有的文案进行深度优化：{data.base_copy}")

    parts.append(f"""
【字数要求】最高优先级！{length_rule}，{sentence_hint}。字数不达标将不合格。

【输出格式】直接输出 5 条不同角度的文案，每条独占一行。禁止编号、引号、Markdown 或任何多余内容。""")

    return "\n".join(parts)

# ========== 知识提取（支持 Kimi / ChatGLM） ==========
async def fetch_knowledge_extraction(text: str, model: str = "kimi") -> list:
    """从文本中提取知识三元组，model 可选: kimi / chatglm"""
    prompt = f"""### 任务描述
你是一个高精度的命名实体识别（NER）和关系抽取（RE）专家。请从给定的文本中尽可能多地提取三元组。

### 提取准则
1. **原子性**：每个三元组必须表达一个独立的事实。
2. **连通性**：如果一句话涉及多个动作，请拆解为多个以主语为核心的三元组。
3. **格式严格**：仅返回 JSON 数组，严禁任何前言或后记。

### 示例
输入："苹果公司由史蒂夫·乔布斯在加州创立，总部位于库比蒂诺。"
输出：
[
  {{"subject": "苹果公司", "predicate": "创始人", "object": "史蒂夫·乔布斯"}},
  {{"subject": "苹果公司", "predicate": "创立地点", "object": "加州"}},
  {{"subject": "苹果公司", "predicate": "总部所在地", "object": "库比蒂诺"}}
]

### 待处理文本
{text}"""

    if model == "chatglm":
        content = chatglm_generate(prompt, "你是一个只输出 JSON 数组的结构化数据专家。")
    else:
        completion = client.chat.completions.create(
            model="moonshot-v1-8k",
            messages=[
                {"role": "system", "content": "你是一个只输出 JSON 数组的结构化数据专家。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
        )
        content = completion.choices[0].message.content

    # 结果清洗：提取 [ ] 之间的内容
    try:
        json_str_match = re.search(r'\[.*\]', content, re.DOTALL)
        if json_str_match:
            return json.loads(json_str_match.group())
        return []
    except Exception as e:
        print(f"JSON解析失败: {e}")
        return []