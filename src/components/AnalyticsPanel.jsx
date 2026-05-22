
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, FileText, Target, Calendar } from 'lucide-react';
import React, { useState, useEffect } from 'react';

const AnalyticsPanel = () => {
  const [timeRange, setTimeRange] = useState('7days');

  // 模拟数据
  const usageData = [
    { name: '周一', count: 12 },
    { name: '周二', count: 19 },
    { name: '周三', count: 15 },
    { name: '周四', count: 22 },
    { name: '周五', count: 28 },
    { name: '周六', count: 18 },
    { name: '周日', count: 14 }
  ];

  const categoryData = [
    { name: '产品推广', value: 35, color: '#3B82F6' },
    { name: '电商促销', value: 28, color: '#10B981' },
    { name: '品牌宣传', value: 22, color: '#F59E0B' },
    { name: '活动推广', value: 15, color: '#EF4444' }
  ];

  const styleData = [
    { name: '专业正式', count: 45 },
    { name: '轻松活泼', count: 32 },
    { name: '情感共鸣', count: 28 },
    { name: '幽默风趣', count: 18 }
  ];

  const monthlyTrend = [
    { month: '1月', count: 120 },
    { month: '2月', count: 135 },
    { month: '3月', count: 148 },
    { month: '4月', count: 162 },
    { month: '5月', count: 178 },
    { month: '6月', count: 195 }
  ];

  const stats = [
    {
      title: '总生成次数',
      value: '1,234',
      change: '+12%',
      icon: FileText,
      color: 'blue'
    },
    {
      title: '活跃用户',
      value: '89',
      change: '+8%',
      icon: Target,
      color: 'green'
    },
    {
      title: '平均评分',
      value: '4.8',
      change: '+0.2',
      icon: TrendingUp,
      color: 'yellow'
    },
    {
      title: '本月生成',
      value: '156',
      change: '+25%',
      icon: Calendar,
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-bold text-gray-800">数据分析</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7days">最近7天</option>
          <option value="30days">最近30天</option>
          <option value="90days">最近90天</option>
          <option value="1year">最近一年</option>
        </select>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-green-600">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 每日使用量 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">每日使用量</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 分类分布 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">文案分类分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 风格偏好 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">文案风格偏好</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={styleData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 月度趋势 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">月度生成趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#F59E0B" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 热门产品分析 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">热门产品分析</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  产品名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  生成次数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  平均评分
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  热门风格
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  智能手机
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  45
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  4.8
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  专业正式
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  运动鞋
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  38
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  4.6
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  轻松活泼
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  护肤品
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  32
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  4.7
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  情感共鸣
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;


// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
// import { TrendingUp, FileText, Target, Calendar } from 'lucide-react';
// import React, { useState, useEffect } from 'react';

// const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

// const AnalyticsPanel = () => {
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     // 获取后端真实数据
//     fetch('http://127.0.0.1:8000/api/analytics/summary')
//       .then(res => res.json())
//       .then(json => {
//         setData(json);
//         setLoading(false);
//       });
//   }, []);

//   if (loading) return <div className="p-10 text-center text-gray-500">正在分析文案库数据...</div>;

//   // 统计项定义，包含硬编码字段
//   const stats = [
//     { title: '总生成次数', value: data.total_count, change: '+12%', icon: FileText, color: 'blue' },
//     { title: '活跃用户', value: '89', change: '+8%', icon: Target, color: 'green' }, // 硬编码
//     { title: '平均评分', value: '4.8', change: '+0.2', icon: TrendingUp, color: 'yellow' }, // 硬编码
//     { title: '本月生成', value: '156', change: '+25%', icon: Calendar, color: 'purple' }
//   ];

//   return (
//     <div className="space-y-6">
//       <div className="flex justify-between items-center">
//         <h2 className="text-2xl font-bold text-gray-800">数据分析</h2>
//       </div>

//       {/* 统计卡片 */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//         {stats.map((stat, index) => (
//           <div key={index} className="bg-white rounded-lg shadow p-6 border border-gray-100">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600">{stat.title}</p>
//                 <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
//                 <p className="text-sm text-green-600">{stat.change}</p>
//               </div>
//               <div className={`p-3 rounded-full bg-${stat.color}-50`}>
//                 <stat.icon className={`h-6 w-6 text-${stat.color}-500`} />
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* 每日使用量 */}
//         <div className="bg-white rounded-lg shadow p-6">
//           <h3 className="text-lg font-semibold mb-4">每日使用量趋势</h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <BarChart data={data.usageData}>
//               <CartesianGrid strokeDasharray="3 3" vertical={false} />
//               <XAxis dataKey="name" />
//               <YAxis />
//               <Tooltip />
//               <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>

//         {/* 分类分布 */}
//         <div className="bg-white rounded-lg shadow p-6">
//           <h3 className="text-lg font-semibold mb-4">文案分类分布</h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <PieChart>
//               <Pie
//                 data={data.categoryData}
//                 dataKey="value"
//                 nameKey="name"
//                 cx="50%" cy="50%"
//                 outerRadius={80}
//                 label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
//               >
//                 {data.categoryData.map((entry, index) => (
//                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                 ))}
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>
//       </div>

//       {/* 热门产品分析表格 */}
//       <div className="bg-white rounded-lg shadow p-6">
//         <h3 className="text-lg font-semibold mb-4">热门产品 TOP 5</h3>
//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
//               <tr>
//                 <th className="px-6 py-3 text-left">产品名称</th>
//                 <th className="px-6 py-3 text-left">生成频次</th>
//                 <th className="px-6 py-3 text-left">常用风格</th>
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {data.hotProducts.map((row, idx) => (
//                 <tr key={idx} className="hover:bg-gray-50 transition-colors">
//                   <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.product}</td>
//                   <td className="px-6 py-4 text-sm text-gray-500">{row.count} 次</td>
//                   <td className="px-6 py-4 text-sm text-blue-600">{row.hot_style}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AnalyticsPanel;