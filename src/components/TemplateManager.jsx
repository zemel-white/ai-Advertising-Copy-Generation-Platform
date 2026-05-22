import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Upload } from 'lucide-react';
// import { supabase } from "@/integrations/supabase/client";
const API_BASE = "http://127.0.0.1:8000/api";
const TemplateManager = () => {
  const [templates, setTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  const categories = ['all', '电商', '品牌', '新品', '服务', '活动'];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/templates`);
      const data = await res.json();
      setTemplates(data);
    } catch (error) { console.error('获取模板失败:', error); }
    finally { setLoading(false); }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const deleteTemplate = async (id) => {
    if (!window.confirm("确定删除吗？")) return;
    try {
      const res = await fetch(`${API_BASE}/templates/${id}`, { method: 'DELETE' });
      if (res.ok) setTemplates(templates.filter(t => t.id !== id));
    } catch (error) { console.error('删除失败:', error); }
  };


  const TemplateForm = ({ template, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      name: template?.name || '',
      category: template?.category || '电商',
      content: template?.content || '',
      tags: Array.isArray(template?.tags) ? template.tags.join(', ') : (template?.tags || '')
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      const url = template ? `${API_BASE}/templates/${template.id}` : `${API_BASE}/templates`;
      const method = template ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          fetchTemplates(); // 重新刷新列表
          onSave();
        }
      } catch (error) { console.error('保存失败:', error); }
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">
          {template ? '编辑模板' : '添加新模板'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              模板名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分类
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.filter(cat => cat !== 'all').map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              模板内容
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="使用 {变量名} 来标记可替换的内容"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标签 (用逗号分隔)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: 促销, 限时, 电商"
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              保存
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    );
  };

  // // 导入知识库内容
  // const importKnowledgeBase = async (event) => {
  //   const file = event.target.files[0];
  //   if (!file) return;

  //   try {
  //     const text = await file.text();
  //     const lines = text.split('\n').filter(line => line.trim());
      
  //     // 假设每行格式为: 标题,内容,分类,标签(用逗号分隔)
  //     const newTemplates = lines.map((line, index) => {
  //       const [name, content, category, tags] = line.split(',');
  //       return {
  //         name: name?.trim() || `导入内容 ${index + 1}`,
  //         content: content?.trim() || '',
  //         category: category?.trim() || 'general',
  //         tags: tags?.split(',').map(tag => tag.trim()).filter(tag => tag) || []
  //       };
  //     });

  //     // 批量插入到数据库
  //     const { error } = await supabase
  //       .from('templates')
  //       .insert(newTemplates);

  //     if (error) throw error;
      
  //     fetchTemplates(); // 重新获取模板列表
  //     alert(`成功导入 ${newTemplates.length} 条内容`);
  //   } catch (error) {
  //     console.error('导入失败:', error);
  //     alert('导入失败，请检查文件格式');
  //   }
  // };

  // 导入知识库内容
  const importTemplates = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    setLoading(true);
    try {
      const text = await file.text();
      // 假设文件格式是：标题|内容|分类|标签(用空格隔开)
      // 使用 | 作为分隔符更安全，因为文案内容里经常有逗号
      const lines = text.split('\n').filter(line => line.trim());
      
      const templateData = lines.map(line => {
        const [name, content, category, tagsStr] = line.split('|');
        return {
          name: name?.trim() || "未命名模板",
          content: content?.trim() || "",
          category: category?.trim() || "其他",
          tags: tagsStr ? tagsStr.trim().split(' ') : []
        };
      }).filter(item => item.content); // 过滤掉没有内容的行
  
      if (templateData.length === 0) {
        alert("未识别到有效数据，请检查文件格式。建议格式：标题|内容|分类|标签1 标签2");
        return;
      }
  
      // 调用后端批量导入接口
      const response = await fetch(`${API_BASE}/templates/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: templateData })
      });
  
      if (response.ok) {
        const result = await response.json();
        alert(`成功导入 ${result.count} 条模板！`);
        fetchTemplates(); // 刷新列表
      } else {
        throw new Error("后端保存失败");
      }
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入出错，请确保文件编码为 UTF-8 且格式正确');
    } finally {
      setLoading(false);
      event.target.value = ''; // 清空 input 方便下次上传
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-bold text-gray-800">内容管理</h2>
        <div className="flex space-x-2">
          <label className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2 cursor-pointer">
            <Upload className="h-5 w-5" />
            <span>导入内容</span>
            <input
              type="file"
              accept=".txt,.csv"
              onChange={importTemplates}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>添加模板</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="搜索模板..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? '全部分类' : category}
            </option>
          ))}
        </select>
      </div>

      {(showAddForm || editingTemplate) && (
        <TemplateForm
          template={editingTemplate}
          onSave={() => {
            setShowAddForm(false);
            setEditingTemplate(null);
          }}
          onCancel={() => {
            setShowAddForm(false);
            setEditingTemplate(null);
          }}
        />
      )}

      <div className="grid gap-4">
        {filteredTemplates.map(template => (
          <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{template.name}</h3>
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mt-1">
                  {template.category}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingTemplate(template)}
                  className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <p className="text-gray-700 mb-4">{template.content}</p>
            
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag, index) => (
                <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">没有找到匹配的模板</p>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;
