from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_
from datetime import datetime, timedelta

# 导入你的配置
from database import SessionLocal, CopywriterHistory, Template, AnalyticsData,KnowledgeGraph,GraphOperation,Triplet
from models import CopywritingRequest, GeneratedResponse, fetch_kimi_copy,fetch_knowledge_extraction
from pydantic import BaseModel
from typing import List, Dict, Any
from neo4j import GraphDatabase

app = FastAPI(title="AI 文案助手 API")

# --- 数据库依赖项 ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 前端传参的数据模型 ---
class HistorySaveRequest(BaseModel):
    product: str
    target: str
    style: str
    content: str
    category: str

# --- 模板管理数据模型 ---
class TemplateCreate(BaseModel):
    name: str
    category: str
    content: str
    tags: list = []

# --- 批量导入模板的数据模型 ---
class TemplateBulkCreate(BaseModel):
    items: list[TemplateCreate]


# --- 知识图谱模板的数据模型 ---
class TripletSchema(BaseModel): 
    subject: str
    predicate: str
    object: str  

class TripletUpdateSchema(BaseModel):
    id: int
    subject: str
    predicate: str
    object: str

class GraphSaveRequest(BaseModel):
    triplets: List[TripletSchema]

# 配置跨域，允许前端 React 应用访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")  # 必须是 / 
async def root():
    return {"status": "success"}

# --- 生成文案的接口 ---
@app.post("/api/generate-copy", response_model=GeneratedResponse)
async def generate_copy_endpoint(request: CopywritingRequest):
    # 基础校验
    if not request.product or not request.target:
        raise HTTPException(status_code=400, detail="产品名称和受众是必填项")

    try:
        # 调用 models.py 中的生成函数
        results = await fetch_kimi_copy(request)
        model_name = "chatglm3-6b-lora" if request.model == "chatglm" else "moonshot-v1-8k"
        return {
            "copies": results,
            "model": model_name
        }
    except Exception as e:
        print(f"API 运行错误: {str(e)}")
        raise HTTPException(status_code=500, detail="AI 服务暂时不可用，请稍后再试")
    
# --- 保存到历史记录的接口 ---
@app.post("/api/save-history")
async def save_history(item: HistorySaveRequest, db: Session = Depends(get_db)):
    try:
        new_history = CopywriterHistory(
            product=item.product,
            target=item.target,
            style=item.style,
            content=item.content,
            category=item.category
        )
        db.add(new_history)
        db.commit()
        db.refresh(new_history)
        return {"status": "success", "message": "已保存到数据库", "id": new_history.id}
    except Exception as e:
        db.rollback()
        print(f"数据库保存失败: {str(e)}")
        raise HTTPException(status_code=500, detail="数据库写入失败")
    

# --- 查询数据库文案历史记录接口 ---
@app.get("/api/get-history")
async def get_history(db: Session = Depends(get_db)):
    try:
        # 从数据库查询所有记录，按创建时间倒序排列
        # 注意：确保你的 database.py 中 CopywriterHistory 包含 created_at 字段
        histories = db.query(CopywriterHistory).order_by(CopywriterHistory.created_at.desc()).all()
        
        # 将 SQLAlchemy 对象转换为字典列表
        return histories
    except Exception as e:
        print(f"获取历史记录失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取历史记录失败")
    
# --- 模板模糊搜索接口 ---
@app.get("/api/templates/search")
async def search_templates(q: str = "", db: Session = Depends(get_db)):
    if not q:
        return []
    try:
        results = db.query(Template).filter(
            (Template.name.contains(q)) | (Template.content.contains(q))
        ).limit(10).all() 
        return results
    except Exception as e:
        print(f"搜索模板出错: {str(e)}")
        return []

# --- 历史记录删除功能 ---
@app.delete("/api/delete-history/{history_id}")
async def delete_history(history_id: int, db: Session = Depends(get_db)):
    db_item = db.query(CopywriterHistory).filter(CopywriterHistory.id == history_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="记录未找到")
    db.delete(db_item)
    db.commit()
    return {"status": "success"}


# --- 获取所有模板 ---
@app.get("/api/templates")
async def get_templates(db: Session = Depends(get_db)):
    return db.query(Template).order_by(Template.created_at.desc()).all()

# --- 新增模板 ---
@app.post("/api/templates")
async def create_template(item: TemplateCreate, db: Session = Depends(get_db)):
    new_template = Template(**item.dict())
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    return new_template

# --- 导入模板 ---
@app.post("/api/templates/bulk")
async def bulk_create_templates(data: TemplateBulkCreate, db: Session = Depends(get_db)):
    try:
        new_items = []
        for item in data.items:
            # 将 tags 列表转换为模型需要的格式
            new_item = Template(
                name=item.name,
                category=item.category,
                content=item.content,
                tags=item.tags
            )
            new_items.append(new_item)
        
        db.add_all(new_items)
        db.commit()
        return {"status": "success", "count": len(new_items)}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"批量导入失败: {str(e)}")

# --- 更新模板 ---
@app.put("/api/templates/{template_id}")
async def update_template(template_id: int, item: TemplateCreate, db: Session = Depends(get_db)):
    db_item = db.query(Template).filter(Template.id == template_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="模板不存在")
    
    for key, value in item.dict().items():
        setattr(db_item, key, value)
    
    db.commit()
    return {"status": "success"}

# --- 删除模板 ---
@app.delete("/api/templates/{template_id}")
async def delete_template(template_id: int, db: Session = Depends(get_db)):
    db_item = db.query(Template).filter(Template.id == template_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="模板不存在")
    db.delete(db_item)
    db.commit()
    return {"status": "success"}

# --- 核心分析接口 (对接最新前端) ---
@app.get("/api/analytics/summary")
async def get_analytics_summary(db: Session = Depends(get_db)):
    try:
        now = datetime.now()
        current_month = now.month
        current_year = now.year
        
        # 1. 计算本月和上月的起止日期逻辑用于环比统计
        # 本月第一天
        first_day_this_month = datetime(current_year, current_month, 1)
        # 上月最后一天是本月第一天减一秒
        last_day_last_month = first_day_this_month - timedelta(seconds=1)
        # 上月第一天
        first_day_last_month = datetime(last_day_last_month.year, last_day_last_month.month, 1)

        # 2. 统计卡片数据计算
        # 总生成次数
        total_count = db.query(CopywriterHistory).count()
        
        # 本月生成数
        this_month_count = db.query(CopywriterHistory).filter(
            CopywriterHistory.created_at >= first_day_this_month
        ).count()

        # 上月生成数 (用于计算 change)
        last_month_count = db.query(CopywriterHistory).filter(
            and_(
                CopywriterHistory.created_at >= first_day_last_month,
                CopywriterHistory.created_at <= last_day_last_month
            )
        ).count()

        # 计算环比增长率
        if last_month_count > 0:
            growth = ((this_month_count - last_month_count) / last_month_count) * 100
            growth_str = f"{'+' if growth >= 0 else ''}{round(growth, 1)}%"
        else:
            growth_str = "0%" # 默认如果没有比较数据则为 0

        # 3. 获取图表数据
        # 每日使用趋势 (usageData)
        daily_usage = db.query(
            func.date(CopywriterHistory.created_at).label("name"),
            func.count(CopywriterHistory.id).label("count")
        ).group_by(func.date(CopywriterHistory.created_at)).order_by("name").limit(7).all()

        # 分类分布 (categoryData)
        category_dist = db.query(
            CopywriterHistory.category.label("name"),
            func.count(CopywriterHistory.id).label("value")
        ).group_by(CopywriterHistory.category).all()

        # 风格偏好统计 (styleData)
        style_dist = db.query(
            CopywriterHistory.style.label("name"),
            func.count(CopywriterHistory.id).label("count")
        ).group_by(CopywriterHistory.style).all()

        # 4. 热门产品分析表格
        hot_products = db.query(
            CopywriterHistory.product.label("product"),
            func.count(CopywriterHistory.id).label("count"),
            func.max(CopywriterHistory.style).label("hot_style")
        ).group_by(CopywriterHistory.product).order_by(func.count(CopywriterHistory.id).desc()).limit(5).all()

        return {
            "total_count": total_count,
            "this_month": {
                "count": this_month_count,
                "growth": growth_str
            },
            "usageData": daily_usage,
            "categoryData": category_dist,
            "styleData": style_dist,
            "hotProducts": hot_products
        }
    except Exception as e:
        print(f"分析接口报错: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    


# --- 知识图谱核心接口 ---

# 1. 提取三元组 (支持 Kimi / ChatGLM)
@app.post("/api/knowledge/extract")
async def extract_triplets(request: Dict[str, str]):
    text = request.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="文本内容为空")

    model = request.get("model", "kimi")  # 可选: kimi / chatglm
    triplets = await fetch_knowledge_extraction(text, model=model)
    if not triplets:
        raise HTTPException(status_code=500, detail="LLM 未能提取有效的三元组")

    return {"triplets": triplets, "model": model}

# 2. 保存图谱并记录操作
# @app.post("/api/knowledge/save")
# async def save_knowledge_graph(data: GraphSaveRequest, db: Session = Depends(get_db)):
#     try:
#         # 1. 先创建图谱主体
#         graph_name = f"知识图谱_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
#         new_graph = KnowledgeGraph(
#             name=graph_name,
#             description=f"包含 {len(data.triplets)} 个三元组"
#         )
#         db.add(new_graph)
#         db.flush()  # 获取自增的 new_graph.id

#         for t in data.triplets:
#             # 使用 TripletModel 确保调用的是数据库模型
#             db_triplet = Triplet(
#                 graph_id=new_graph.id,
#                 subject=t.subject,
#                 predicate=t.predicate,
#                 object=t.object
#             )
#             db.add(db_triplet)

#             # --- 新增：记录每一条关系的增加 ---
#             db.add(GraphOperation(
#                 operation_type="add", # 统一标识为 add
#                 entity_type="link",
#                 subject=t.subject,
#                 predicate=t.predicate,
#                 object=t.object
#             ))
        
#         db.commit()
#         return {"status": "success", "id": new_graph.id}
#     except Exception as e:
#         db.rollback()
#         # 打印详细错误方便调试
#         print(f"Error: {e}") 
#         raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")

@app.post("/api/knowledge/save")
async def save_knowledge_graph(data: GraphSaveRequest, db: Session = Depends(get_db)):
    try:
        # 创建一个总的图谱容器
        new_graph = KnowledgeGraph(
            name=f"文本提取_{datetime.now().strftime('%m%d_%H%M')}",
            description="LLM 自动提取结果"
        )
        db.add(new_graph)
        db.flush() 

        added_triplets = []
        for t in data.triplets:
            # 简单的去重逻辑：检查是否已存在完全一样的三元组（可选）
            db_triplet = Triplet(
                graph_id=new_graph.id,
                subject=t.subject,
                predicate=t.predicate,
                object=t.object
            )
            db.add(db_triplet)
            
            # 记录审计日志
            db.add(GraphOperation(
                operation_type="add",
                entity_type="link",
                subject=t.subject,
                predicate=t.predicate,
                object=t.object
            ))
        
        db.commit()
        return {"status": "success", "graph_id": new_graph.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
    

# 3. 删除节点及其关联关系
@app.delete("/api/knowledge/link/{graph_id}/{index}")
async def delete_graph_link(graph_id: int, index: int, db: Session = Depends(get_db)):
    graph = db.query(KnowledgeGraph).filter(KnowledgeGraph.id == graph_id).first()
    if not graph: 
        raise HTTPException(status_code=404, detail="未找到图谱")
    
    # 移除指定索引的三元组
    triplets = list(graph.triplets)
    if 0 <= index < len(triplets):
        removed = triplets.pop(index)
        graph.triplets = triplets
        # 记录操作
        db.add(GraphOperation(
            operation_type="delete", entity_type="link",
            subject=removed.get('subject'), predicate=removed.get('predicate'), object=removed.get('object')
        ))
        db.commit()
        return {"status": "success"}
    raise HTTPException(status_code=400, detail="索引越界")

# 删除特定三元组（通过三元组自身的 ID）
@app.delete("/api/knowledge/triplet/{triplet_id}")
async def delete_triplet(triplet_id: int, db: Session = Depends(get_db)):
    triplet = db.query(Triplet).filter(Triplet.id == triplet_id).first()
    if not triplet:
        raise HTTPException(status_code=404, detail="三元组不存在")
    
    # 记录日志
    db.add(GraphOperation(
        operation_type="delete", entity_type="link",
        subject=triplet.subject, predicate=triplet.predicate, object=triplet.object
    ))
    
    db.delete(triplet)
    db.commit()
    return {"status": "success"}

# 删除节点（清理所有涉及该名称的记录）
@app.delete("/api/knowledge/node/{node_name}")
async def delete_knowledge_node(node_name: str, db: Session = Depends(get_db)):
    # 直接在三元组表中删除 subject 或 object 匹配的行
    deleted_rows = db.query(Triplet).filter(
        (Triplet.subject == node_name) | (Triplet.object == node_name)
    ).delete(synchronize_session=False)
    
    db.add(GraphOperation(
        operation_type="delete", entity_type="node",
        subject=node_name, predicate="all_relations", object="null"
    ))
    
    db.commit()
    return {"status": "success", "affected_rows": deleted_rows}

# 4. 获取操作记录 (对应前端“图谱记录”页面)
@app.get("/api/knowledge/operations")
async def get_graph_operations(db: Session = Depends(get_db)):
    # 返回最近20条记录
    return db.query(GraphOperation).order_by(GraphOperation.created_at.desc()).limit(20).all()

@app.get("/api/knowledge/list")
async def get_graphs(db: Session = Depends(get_db)):
    # 1. 查询所有图谱
    graphs = db.query(KnowledgeGraph).order_by(KnowledgeGraph.created_at.desc()).all()
    
    results = []
    for g in graphs:
        # 2. 显式查询该图谱下的所有三元组
        triplets = db.query(Triplet).filter(Triplet.graph_id == g.id).all()
        
        results.append({
            "id": g.id,
            "name": g.name,
            "created_at": g.created_at,
            "description": g.description,
            # 转换为前端可以遍历的列表
            "triplets": [
                {
                    "id": t.id,
                    "subject": t.subject,
                    "predicate": t.predicate,
                    "object": t.object
                } for t in triplets
            ]
        })
    return results


# 5. 获取数据统计 (对应前端卡片)
@app.get("/api/knowledge/statistics")
async def get_graph_stats(db: Session = Depends(get_db)):
    # 直接查询数据库获取总数，效率更高
    total_relations = db.query(Triplet).count()
    
    # 获取去重后的实体数
    subjects = db.query(Triplet.subject).distinct().all()
    objects = db.query(Triplet.object).distinct().all()
    all_nodes = set([s[0] for s in subjects] + [o[0] for o in objects])
            
    today_count = db.query(GraphOperation).filter(
        func.date(GraphOperation.created_at) == datetime.now().date()
    ).count()

    return {
        "total_entities": len(all_nodes),
        "total_relations": total_relations,
        "today_operations": today_count
    }

# 图谱可视化更新接口
@app.put("/api/knowledge/triplet/update")
async def update_triplet(item: TripletUpdateSchema, db: Session = Depends(get_db)):
    db_item = db.query(Triplet).filter(Triplet.id == item.id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="三元组不存在")
    
    db_item.subject = item.subject
    db_item.predicate = item.predicate
    db_item.object = item.object
    
    # 记录审计日志
    db.add(GraphOperation(
        operation_type="edit", 
        entity_type="link",
        subject=f"{item.subject} (已修改)",
        predicate=item.predicate, 
        object=item.object
    ))
    db.commit()
    return {"status": "success"}

# --- 图谱模糊搜索 ---（暂时无用）
@app.get("/api/knowledge/search")
async def search_entities(query: str, db: Session = Depends(get_db)):
    # 查询所有 subject 或 object 包含 query 的三元组
    results = db.query(Triplet).filter(
        (Triplet.subject.like(f"%{query}%")) | 
        (Triplet.object.like(f"%{query}%"))
    ).all()
    
    # 转换为前端 graphData 格式
    nodes = set()
    links = []
    for r in results:
        nodes.add(r.subject)
        nodes.add(r.object)
        links.append({"source": r.subject, "target": r.object, "label": r.predicate})
    
    return {
        "nodes": [{"id": n} for n in nodes],
        "links": links
    }
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)