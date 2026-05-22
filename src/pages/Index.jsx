import React, { useState } from 'react';
import { Sparkles, FileText, History, Settings, TrendingUp, Menu, X, Brain, Network } from 'lucide-react';
import CopywriterGenerator from '../components/CopywriterGenerator';
import TemplateManager from '../components/TemplateManager';
import HistoryPanel from '../components/HistoryPanel';
import AnalyticsPanel from '../components/AnalyticsPanel';
import SettingsDialog from '../components/SettingsDialog';
import ModelTraining from '../components/ModelTraining';
import KnowledgeGraph from '../components/KnowledgeGraph';

const Index = () => {
  const [activeTab, setActiveTab] = useState('generator');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const tabs = [
    { id: 'generator', label: '文案生成', icon: Sparkles },
    { id: 'templates', label: '模板管理', icon: FileText },
    { id: 'history', label: '历史记录', icon: History },
    { id: 'analytics', label: '数据分析', icon: TrendingUp },
    { id: 'training', label: '模型训练', icon: Brain },
    { id: 'knowledge', label: '知识图谱', icon: Network }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'generator':
        return <CopywriterGenerator />;
      case 'templates':
        return <TemplateManager />;
      case 'history':
        return <HistoryPanel />;
      case 'analytics':
        return <AnalyticsPanel />;
      case 'training':
        return <ModelTraining />;
      case 'knowledge':
        return <KnowledgeGraph />;
      default:
        return <CopywriterGenerator />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* 左侧导航栏 */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-gray-800 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <h1 className="text-xl font-bold">智能文案系统</h1>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-md hover:bg-gray-700"
            >
              {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        
        <nav className="flex-1 py-4">
          <ul className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 text-left hover:bg-gray-700 ${
                      activeTab === tab.id ? 'bg-gray-700 border-r-4 border-blue-500' : ''
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3">{tab.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部栏 */}
        <header className="bg-white shadow-sm border-b border-gray-200 py-4 px-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                当前位置: 智能文案系统 / {tabs.find(tab => tab.id === activeTab)?.label}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </header>

        {/* 内容区域 */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            {renderContent()}
          </div>
        </main>
      </div>
      
      {/* 设置弹窗 */}
      <SettingsDialog 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );
};

export default Index;
