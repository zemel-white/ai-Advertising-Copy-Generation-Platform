import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit, Save } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

const SettingsDialog = ({ isOpen, onClose }) => {
  const [models, setModels] = useState([]);
  const [editingModel, setEditingModel] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai',
    api_key: '',
    is_default: false,
    temperature: 0.7,
    top_p: 1.0,
    max_tokens: 2048,
    system_prompt: 'You are a helpful assistant.'
  });

  useEffect(() => {
    if (isOpen) {
      fetchModels();
    }
  }, [isOpen]);

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error('获取模型列表失败:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingModel) {
        // 更新模型
        const { error } = await supabase
          .from('ai_models')
          .update({ 
            ...formData, 
            updated_at: new Date() 
          })
          .eq('id', editingModel.id);

        if (error) throw error;
        
        // 如果设置为默认模型，需要将其他模型设为非默认
        if (formData.is_default) {
          await supabase
            .from('ai_models')
            .update({ is_default: false })
            .neq('id', editingModel.id);
        }
        
        setModels(models.map(m => m.id === editingModel.id ? { ...m, ...formData } : m));
      } else {
        // 添加新模型
        const { data, error } = await supabase
          .from('ai_models')
          .insert([formData])
          .select();

        if (error) throw error;
        
        // 如果设置为默认模型，需要将其他模型设为非默认
        if (formData.is_default) {
          await supabase
            .from('ai_models')
            .update({ is_default: false })
            .neq('id', data[0].id);
          
          setModels([data[0], ...models.map(m => ({ ...m, is_default: false }))]);
        } else {
          setModels([data[0], ...models]);
        }
      }
      
      // 重置表单状态
      setFormData({
        name: '',
        provider: 'openai',
        api_key: '',
        is_default: false,
        temperature: 0.7,
        top_p: 1.0,
        max_tokens: 2048,
        system_prompt: 'You are a helpful assistant.'
      });
      setEditingModel(null);
      setShowAddForm(false);
    } catch (error) {
      console.error('保存模型失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleEdit = (model) => {
    setFormData({
      name: model.name,
      provider: model.provider,
      api_key: model.api_key,
      is_default: model.is_default,
      temperature: model.temperature || 0.7,
      top_p: model.top_p || 1.0,
      max_tokens: model.max_tokens || 2048,
      system_prompt: model.system_prompt || 'You are a helpful assistant.'
    });
    setEditingModel(model);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个模型吗？')) return;
    
    try {
      const { error } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setModels(models.filter(m => m.id !== id));
    } catch (error) {
      console.error('删除模型失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      // 将所有模型设为非默认
      await supabase
        .from('ai_models')
        .update({ is_default: false });
      
      // 将选中的模型设为默认
      const { error } = await supabase
        .from('ai_models')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      
      setModels(models.map(m => ({ ...m, is_default: m.id === id })));
    } catch (error) {
      console.error('设置默认模型失败:', error);
      alert('设置失败，请重试');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">AI模型设置</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="mb-6">
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingModel(null);
                setFormData({
                  name: '',
                  provider: 'openai',
                  api_key: '',
                  is_default: false,
                  temperature: 0.7,
                  top_p: 1.0,
                  max_tokens: 2048,
                  system_prompt: 'You are a helpful assistant.'
                });
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>添加新模型</span>
            </button>
          </div>
          
          {showAddForm && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-medium mb-4">
                {editingModel ? '编辑模型' : '添加新模型'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    模型名称
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    提供商
                  </label>
                  <select
                    value={formData.provider}
                    onChange={(e) => setFormData({...formData, provider: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API密钥
                  </label>
                  <input
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      温度 (Temperature)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={formData.temperature}
                      onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Top-P
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={formData.top_p}
                      onChange={(e) => setFormData({...formData, top_p: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      最大令牌数
                    </label>
                    <input
                      type="number"
                      value={formData.max_tokens}
                      onChange={(e) => setFormData({...formData, max_tokens: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    系统提示词
                  </label>
                  <textarea
                    value={formData.system_prompt}
                    onChange={(e) => setFormData({...formData, system_prompt: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                    设为默认模型
                  </label>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>保存</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingModel(null);
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          )}
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">已配置的模型</h3>
            {models.length === 0 ? (
              <p className="text-gray-500">暂无配置的模型</p>
            ) : (
              <div className="space-y-3">
                {models.map((model) => (
                  <div 
                    key={model.id} 
                    className={`border rounded-lg p-4 ${
                      model.is_default ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{model.name}</h4>
                          {model.is_default && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              默认
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          提供商: {model.provider}
                        </p>
                        <p className="text-sm text-gray-600">
                          API密钥: {model.api_key.substring(0, 4)}...
                        </p>
                        <div className="text-sm text-gray-600 mt-1">
                          <p>温度: {model.temperature || 0.7}</p>
                          <p>Top-P: {model.top_p || 1.0}</p>
                          <p>最大令牌: {model.max_tokens || 2048}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(model)}
                          className="p-2 text-gray-600 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(model.id)}
                          className="p-2 text-gray-600 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {!model.is_default && (
                      <button
                        onClick={() => handleSetDefault(model.id)}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                      >
                        设为默认模型
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
