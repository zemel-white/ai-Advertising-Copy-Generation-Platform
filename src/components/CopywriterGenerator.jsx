import { useQuery } from '@tanstack/react-query';
import { Copy, Wand2, RefreshCw, Download, Search } from 'lucide-react';
import React, { useState } from 'react';
// import { supabase } from "@/integrations/supabase/client";

const CopywriterGenerator = () => {
  const [searchResults, setSearchResults] = useState([]); // 存储搜索到的模板
  const [isSearching, setIsSearching] = useState(false); // 搜索加载状态

  const [formData, setFormData] = useState({
    product: '',
    target: '',
    style: 'professional',
    length: 'medium',
    language: 'zh',
    platform: 'douyin',
    description: ''
  });
  const [generatedCopies, setGeneratedCopies] = useState([]);
  const [selectedCopy, setSelectedCopy] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [referenceContent, setReferenceContent] = useState('');
  const [showReferenceSearch, setShowReferenceSearch] = useState(false);

  const handleSearch = async () => {
    if (!referenceContent.trim()) {
      alert("请输入搜索关键词");
      return;
    }
    
    setIsSearching(true);
    setShowReferenceSearch(true); // 展开搜索结果面板
    
    try {
      const response = await fetch(`http://localhost:8000/api/templates/search?q=${encodeURIComponent(referenceContent)}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json' 
        }
      });

      if (!response.ok) {
        throw new Error('网络请求失败');
      }

      const data = await response.json();
      
      // 3. 将后端返回的匹配列表存入状态
      setSearchResults(data); 
      
    } catch (error) {
      console.error("搜索失败:", error);
      alert("搜索失败，请检查后端服务是否开启");
    } finally {
      setIsSearching(false);
    }
  };

  const generateCopy = async (baseCopy = null) => {
    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:8000/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          reference_content: referenceContent,
          base_copy: baseCopy
        })
      });
      const data = await response.json();
      setGeneratedCopies(data.copies);
    } catch (error) {
      alert("生成失败");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('文案已复制到剪贴板！');
  };

  // 保存文案到历史记录
  const saveToHistory = async () => {
    if (!selectedCopy) {
      alert('请先选择一个文案');
      return;
    }
    
    try {
      // 替换为 FastAPI 接口调用
      const response = await fetch('http://localhost:8000/api/save-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product: formData.product,
          target: formData.target,
          style: formData.style,
          content: selectedCopy,
          category: '产品推广' // 或者从 formData 中动态获取
        }),
      });
  
      if (!response.ok) {
        throw new Error('网络请求失败');
      }
  
      const result = await response.json();
      alert('文案已成功保存到 MySQL 历史记录！');
    } catch (error) {
      console.error('保存历史记录失败:', error);
      alert('保存失败，请检查后端服务是否开启');
    }
  };

  const handleSelectTemplate = (content) => {
    setReferenceContent(content);
    setShowReferenceSearch(false); // 选择后关闭浮层
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            产品名称
          </label>
          <input
            type="text"
            value={formData.product}
            onChange={(e) => setFormData({...formData, product: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入产品名称"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            产品描述
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入产品描述"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            目标受众
          </label>
          <input
            type="text"
            value={formData.target}
            onChange={(e) => setFormData({...formData, target: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入目标受众"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            面向平台
          </label>
          <select
            value={formData.platform}
            onChange={(e) => setFormData({...formData, platform: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="douyin">抖音</option>
            <option value="xiaohongshu">小红书</option>
            <option value="kuaishou">快手</option>
            <option value="wechat">微信朋友圈</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            文案风格
          </label>
          <select
            value={formData.style}
            onChange={(e) => setFormData({...formData, style: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="professional">专业正式</option>
            <option value="casual">轻松活泼</option>
            <option value="emotional">情感共鸣</option>
            <option value="humorous">幽默风趣</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            文案长度
          </label>
          <select
            value={formData.length}
            onChange={(e) => setFormData({...formData, length: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="short">0-20字</option>
            <option value="medium">20-50字</option>
            <option value="long">50-200字</option>
            <option value="extra-long">200字以上</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            内容参考
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={referenceContent}
              onChange={(e) => setReferenceContent(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入关键词(如: 手机、运动鞋)"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()} // 支持回车搜索
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center disabled:bg-gray-400"
            >
            {isSearching ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            </button>
          </div>
          
          {showReferenceSearch && (
            <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200 max-h-60 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        setReferenceContent(item.content); // 点击后将内容填入输入框
                        setShowReferenceSearch(false);
                      }}
                      className="p-2 bg-white rounded border border-gray-100 hover:border-blue-400 cursor-pointer transition-colors"
                    >
                      {/* 同时展示标题和内容 */}
                      <div className="text-xs font-bold text-blue-600 mb-1">{item.name}</div>
                      <div className="text-sm text-gray-600 line-clamp-2">{item.content}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">
                  {isSearching ? "搜索中..." : "未找到相关内容"}
                </p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => generateCopy()}
          disabled={isGenerating || !formData.product || !formData.target}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isGenerating ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <Wand2 className="h-5 w-5" />
          )}
          <span>{isGenerating ? '生成中...' : '生成文案'}</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-6 min-h-[300px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">生成的文案</h3>
            {generatedCopies.length > 0 && (
              <button
                onClick={() => generateCopy(selectedCopy)}
                disabled={isGenerating}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>重新生成</span>
              </button>
            )}
          </div>
          
          {generatedCopies.length > 0 ? (
            <div className="space-y-4">
              {generatedCopies.map((copy, index) => (
                <div 
                  key={index} 
                  className={`bg-white rounded-md p-4 border ${
                    selectedCopy === copy ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <p className="text-gray-800 leading-relaxed flex-1">{copy}</p>
                    <div className="flex space-x-2 ml-2">
                      <button
                        onClick={() => setSelectedCopy(copy)}
                        className={`px-3 py-1 text-xs rounded ${
                          selectedCopy === copy 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {selectedCopy === copy ? '已选择' : '选择'}
                      </button>
                      <button
                        onClick={() => copyToClipboard(copy)}
                        className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {selectedCopy && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={saveToHistory}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>保存到历史记录</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>请填写产品信息并点击生成文案</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CopywriterGenerator;
