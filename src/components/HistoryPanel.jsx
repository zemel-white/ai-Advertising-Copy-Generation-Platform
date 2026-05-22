import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Download, Trash2, Eye } from 'lucide-react';
// import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = "http://127.0.0.1:8000"; // 你的后端地址

const HistoryPanel = () => {
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const categories = ['all', '产品推广', '电商促销', '品牌宣传', '活动推广'];

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/get-history`);
      if (!response.ok) throw new Error('网络响应不正常');
      const data = await response.json();
      setHistory(data || []);
    } catch (error) {
      console.error('获取历史记录失败:', error);
      alert("无法加载历史记录，请检查后端服务");
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesDate = !selectedDate || item.created_at.split('T')[0] === selectedDate;
    return matchesSearch && matchesCategory && matchesDate;
  });

  // const fetchHistory = async () => {
  //   try {
  //     const { data, error } = await supabase
  //       .from('copywriter_history')
  //       .select('*')
  //       .order('created_at', { ascending: false });

  //     if (error) throw error;
  //     setHistory(data || []);
  //   } catch (error) {
  //     console.error('获取历史记录失败:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const filteredHistory = history.filter(item => {
  //   const matchesSearch = item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //                        item.content.toLowerCase().includes(searchTerm.toLowerCase());
  //   const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
  //   const matchesDate = !selectedDate || item.created_at.split('T')[0] === selectedDate;
  //   return matchesSearch && matchesCategory && matchesDate;
  // });

  // const deleteHistoryItem = async (id) => {
  //   try {
  //     const { error } = await supabase
  //       .from('copywriter_history')
  //       .delete()
  //       .eq('id', id);

  //     if (error) throw error;
  //     setHistory(history.filter(item => item.id !== id));
  //   } catch (error) {
  //     console.error('删除历史记录失败:', error);
  //   }
  // };
  // 修改：调用 FastAPI 删除接口
  const deleteHistoryItem = async (id) => {
    if (!window.confirm("确定要删除这条记录吗？")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/delete-history/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setHistory(history.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const exportHistory = () => {
    const csvContent = [
      ['日期', '时间', '产品', '目标受众', '风格', '分类', '内容'],
      ...filteredHistory.map(item => [
        item.created_at.split('T')[0],
        item.created_at.split('T')[1].split('.')[0],
        item.product,
        item.target,
        item.style,
        item.category,
        item.content
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '文案历史记录.csv';
    link.click();
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-bold text-gray-800">历史记录</h2>
        <button
          onClick={exportHistory}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
        >
          <Download className="h-5 w-5" />
          <span>导出记录</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="搜索历史记录..."
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

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日期时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  产品信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  分类
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{item.created_at.split('T')[0]}</div>
                    <div className="text-sm text-gray-500">{item.created_at.split('T')[1].split('.')[0]}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{item.product}</div>
                    <div className="text-sm text-gray-500">目标: {item.target}</div>
                    <div className="text-sm text-gray-500">风格: {item.style}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteHistoryItem(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredHistory.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">没有找到匹配的历史记录</p>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">文案详情</h3>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">产品信息</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedItem.product}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">目标受众</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedItem.target}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">文案风格</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedItem.style}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">生成时间</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedItem.created_at}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">生成的文案</label>
                  <div className="mt-1 p-4 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-900">{selectedItem.content}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
