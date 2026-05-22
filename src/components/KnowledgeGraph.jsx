import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Database, Eye, Plus, Save, Search, Edit, Trash2 } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';

// API 基础路径，根据实际情况修改
const API_BASE_URL = "http://localhost:8000/api/knowledge";

const KnowledgeGraph = () => {
    const [activeTab, setActiveTab] = useState('visualization');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [inputText, setInputText] = useState('');
    const [extractedTriplets, setExtractedTriplets] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [filteredGraphData, setFilteredGraphData] = useState({ nodes: [], links: [] });
    const [searchQuery, setSearchQuery] = useState('');
    const [showNodeActions, setShowNodeActions] = useState(null); // 控制显示哪个节点的操作菜单
    const [showLinkActions, setShowLinkActions] = useState(null); // 控制显示哪个关系的操作菜单
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedLink, setSelectedLink] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({ subject: '', predicate: '', object: '' });
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

    // 状态补充：记录和统计
    const [operations, setOperations] = useState([]); // 确保初始是数组
    const [statistics, setStatistics] = useState({ total_entities: 0, total_relations: 0, today_operations: 0 });
    const fgRef = useRef();

    // 从数据库加载知识图谱数据
    const loadGraphData = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/list`);
            const graphs = await response.json();

            console.log("原始数据:", graphs); // 调试用，确保能看到 triplets 数组

            const nodesMap = new Map();
            const links = [];

            graphs.forEach(graph => {
                // 确保后端返回了 triplets 字段且不为空
                if (graph.triplets && Array.isArray(graph.triplets)) {
                    graph.triplets.forEach((triplet) => {
                        // 处理节点 (去重)
                        if (triplet.subject && !nodesMap.has(triplet.subject)) {
                            nodesMap.set(triplet.subject, {
                                id: triplet.subject,
                                name: triplet.subject,
                                color: '#3B82F6'
                            });
                        }
                        if (triplet.object && !nodesMap.has(triplet.object)) {
                            nodesMap.set(triplet.object, {
                                id: triplet.object,
                                name: triplet.object,
                                color: '#10B981'
                            });
                        }
                        // 构建关系
                        links.push({
                            source: triplet.subject,
                            target: triplet.object,
                            relation: triplet.predicate,
                            id: String(triplet.id),
                            graphId: graph.id
                        });
                    });
                }
            });

            const finalData = {
                nodes: Array.from(nodesMap.values()),
                links: links
            };

            setGraphData(finalData);
            setFilteredGraphData(finalData);
        } catch (error) {
            console.error('加载图谱数据失败，请检查后端接口输出:', error);
        }
    };

    // 模拟实体识别和大模型调用
    const extractEntities = async (content) => {
        setIsProcessing(true);
        try {
            const response = await fetch(`${API_BASE_URL}/extract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: content }) // 确保 Key 是 "text"
            });

            if (!response.ok) throw new Error('后端提取失败');

            const data = await response.json();
            setExtractedTriplets(data.triplets || []);
        } catch (error) {
            alert(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // 处理文件上传
    const handleFileUpload = (event) => {
        const files = Array.from(event.target.files);
        setUploadedFiles(prev => [...prev, ...files]);
    };

    // 处理文本输入和实体识别
    const handleTextAnalysis = () => {
        if (!inputText.trim()) return;
        extractEntities(inputText);
    };

    // 处理文件内容分析
    const handleFileAnalysis = async (file) => {
        const content = await file.text();
        setInputText(content);
        await extractEntities(content);
    };

    // 保存图谱到数据库
    const saveGraph = async () => {
        if (extractedTriplets.length === 0) return;
        try {
            const response = await fetch(`${API_BASE_URL}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ triplets: extractedTriplets })
            });
            if (response.ok) {
                alert('保存成功！');
                setExtractedTriplets([]);
                loadGraphData();
                loadStatistics();
                loadOperations();
            }
        } catch (error) {
            console.error('保存失败:', error);
        }
    };


    // 根据搜索查询过滤图谱
    // 根据搜索查询过滤图谱（深度优先/广度优先遍历所有关联节点）
    const handleSearch = () => {
        if (!searchQuery.trim()) {
            setFilteredGraphData(graphData);
            return;
        }

        const query = searchQuery.toLowerCase();
        const allNodes = graphData.nodes;
        const allLinks = graphData.links;

        // 1. 找到初始匹配的种子节点 ID
        let currentLevelIds = new Set(
            allNodes
                .filter(node => node.id.toString().toLowerCase().includes(query))
                .map(node => node.id)
        );

        const visitedNodeIds = new Set(currentLevelIds);
        const relevantLinkIds = new Set();

        // 2. 迭代搜索所有关联的节点和边
        let hasNewFound = true;
        while (hasNewFound) {
            hasNewFound = false;
            const nextLevelIds = new Set();

            allLinks.forEach(link => {
                // 获取源和目标的 ID（处理引用对象或原始 ID 的情况）
                const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                const targetId = typeof link.target === 'object' ? link.target.id : link.target;

                // 如果这条边的任意一端在已访问集合中，且这条边还没被记录
                if (visitedNodeIds.has(sourceId) || visitedNodeIds.has(targetId)) {
                    if (!relevantLinkIds.has(link.id)) {
                        relevantLinkIds.add(link.id);

                        // 将两端都加入待探索集合
                        if (!visitedNodeIds.has(sourceId)) {
                            nextLevelIds.add(sourceId);
                            visitedNodeIds.add(sourceId);
                            hasNewFound = true;
                        }
                        if (!visitedNodeIds.has(targetId)) {
                            nextLevelIds.add(targetId);
                            visitedNodeIds.add(targetId);
                            hasNewFound = true;
                        }
                    }
                }
            });
        }

        // 3. 根据收集到的 ID 组装最终数据
        setFilteredGraphData({
            nodes: allNodes.filter(node => visitedNodeIds.has(node.id)),
            links: allLinks.filter(link => relevantLinkIds.has(link.id))
        });
    };

    // 手动新增一行空白三元组
    const addEmptyTriplet = () => {
        setExtractedTriplets([...extractedTriplets, { subject: '', predicate: '', object: '' }]);
    };

    // 更新特定行的字段
    const updateTripletField = (index, field, value) => {
        const updated = [...extractedTriplets];
        updated[index][field] = value;
        setExtractedTriplets(updated);
    };

    // 删除特定行（保存前的本地删除）
    const removeTripletRow = (index) => {
        setExtractedTriplets(extractedTriplets.filter((_, i) => i !== index));
    };

    // 删除节点（及其关联记录）
    const deleteNode = async (nodeId) => {
        if (!confirm('确定要删除此节点及其关联关系吗？')) return;

        try {
            // 假设后端通过名称删除或你有特定的节点ID接口
            const response = await fetch(`${API_BASE_URL}/node/${nodeId}`, { method: 'DELETE' });

            if (response.ok) {
                loadGraphData();    // 刷新图谱
                loadOperations();   // 刷新操作记录
                loadStatistics();   // 刷新数据统计
                setShowNodeActions(null);
                alert('节点已删除');
            }
        } catch (error) {
            console.error('删除失败:', error);
        }
    };

    // 加载统计和记录 (联调 /operations & /statistics)
    const loadOperations = async () => {
        const res = await fetch(`${API_BASE_URL}/operations`);
        const data = await res.json();
        setOperations(data);
    };

    const loadStatistics = async () => {
        const res = await fetch(`${API_BASE_URL}/statistics`);
        const data = await res.json();
        setStatistics(data);
    };

    // 编辑节点
    const editNode = (node) => {
        setSelectedNode(node);
        setEditForm({
            subject: node.name,
            predicate: '',
            object: ''
        });
        setEditMode('node');
        setShowNodeActions(null);
    };

    // 编辑关系
    const editLink = (link) => {
        setSelectedLink(link);
        setEditForm({
            subject: typeof link.source === 'object' ? link.source.name : link.source,
            predicate: link.relation,
            object: typeof link.target === 'object' ? link.target.name : link.target
        });
        setEditMode('link');
        setShowLinkActions(null);
    };

    // 保存编辑的节点或关系
    const saveEdit = async () => {
        try {
            // 如果是编辑节点名称，目前后端对应的 update 接口是 TripletUpdateSchema，
            // 该 schema 强依赖三元组 ID。建议先处理关系更新：
            if (editMode === 'node') {
                alert("暂不支持通过此接口直接修改全局节点名称，请编辑具体的关系。");
                return;
            }

            let url = `${API_BASE_URL}/triplet/update`;

            const payload = {
                id: parseInt(selectedLink.id), // 强制转换为整数
                subject: editForm.subject,
                predicate: editForm.predicate,
                object: editForm.object
            };

            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setEditMode(false);
                loadGraphData();
                loadOperations();
                loadStatistics();
                alert('更新成功');
            } else {
                const errorData = await response.json();
                console.error("校验失败详情:", errorData.detail); // 打印 422 的具体原因
            }
        } catch (error) {
            console.error('更新失败:', error);
        }
    };

    // 删除关系
    const deleteLink = async (tripletId) => {
        if (!confirm('确定要删除此关系吗？')) return;

        try {
            // 修改点：直接调用针对 triplet id 的删除接口
            const response = await fetch(`${API_BASE_URL}/triplet/${tripletId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadGraphData();
                loadOperations();
                loadStatistics();
                setShowLinkActions(null);
                alert('关系已从数据库物理删除');
            } else {
                alert('删除失败');
            }
        } catch (error) {
            console.error('API请求错误:', error);
        }
    };

    const getAdjustedPosition = (x, y) => {
        const menuWidth = 160;
        const menuHeight = 120;
        // 增加 5px 偏移避免遮挡鼠标
        const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth - 5 : x + 5;
        const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight - 5 : y + 5;
        return { x: adjustedX, y: adjustedY };
    };

    useEffect(() => {
        loadGraphData();
        loadOperations();
        loadStatistics();
    }, []);

    useEffect(() => {
        handleSearch();
    }, [searchQuery, graphData]);

    useEffect(() => {
        if (fgRef.current && filteredGraphData.nodes.length > 0) {
            // 延迟执行以确保画布已完成渲染
            setTimeout(() => {
                fgRef.current.zoomToFit(400, 50); // 400ms 平滑过渡，50px 边距
            }, 100);
        }
    }, [filteredGraphData]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <h2 className="text-2xl font-bold text-gray-800">知识图谱</h2>

                <div className="flex space-x-2">
                    <button
                        onClick={() => setActiveTab('input')}
                        className={`px-4 py-2 rounded-md flex items-center space-x-2 ${activeTab === 'input'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        <Upload className="h-5 w-5" />
                        <span>关系录入</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('visualization')}
                        className={`px-4 py-2 rounded-md flex items-center space-x-2 ${activeTab === 'visualization'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        <Eye className="h-5 w-5" />
                        <span>图谱可视化</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('records')}
                        className={`px-4 py-2 rounded-md flex items-center space-x-2 ${activeTab === 'records'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        <Database className="h-5 w-5" />
                        <span>图谱记录</span>
                    </button>
                </div>
            </div>

            {/* 关系录入页面 */}
            {activeTab === 'input' && (
                <div className="space-y-6">
                    {/* 文件上传 */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">文件上传</h3>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                            <input
                                type="file"
                                multiple
                                accept=".txt,.pdf,.doc,.docx"
                                onChange={handleFileUpload}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <p className="text-sm text-gray-500 mt-2">
                                支持上传文本文件、PDF、Word文档等格式
                            </p>
                        </div>

                        {uploadedFiles.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-medium mb-2">已上传文件:</h4>
                                <div className="space-y-2">
                                    {uploadedFiles.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                            <span className="text-sm">{file.name}</span>
                                            <button
                                                onClick={() => handleFileAnalysis(file)}
                                                className="text-blue-600 hover:text-blue-800 text-sm"
                                            >
                                                分析
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 文本输入 */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">文本输入</h3>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="请输入要分析的文本内容..."
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleTextAnalysis}
                            disabled={isProcessing || !inputText.trim()}
                            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                            {isProcessing ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                                <Search className="h-4 w-4" />
                            )}
                            <span>{isProcessing ? '分析中...' : '开始分析'}</span>
                        </button>
                    </div>

                    {/* 提取的三元组展示区 */}
                    {extractedTriplets.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">提取与编辑三元组</h3>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={addEmptyTriplet}
                                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center space-x-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span>手动新增</span>
                                    </button>
                                    <button
                                        onClick={saveGraph}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                                    >
                                        <Save className="h-4 w-4" />
                                        <span>确认并保存到图谱</span>
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">主体 (Subject)</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">关系 (Predicate)</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客体 (Object)</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {extractedTriplets.map((triplet, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={triplet.subject}
                                                        onChange={(e) => updateTripletField(index, 'subject', e.target.value)}
                                                        className="w-full border-gray-300 border rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="输入主体..."
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={triplet.predicate}
                                                        onChange={(e) => updateTripletField(index, 'predicate', e.target.value)}
                                                        className="w-full border-gray-300 border rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="输入关系..."
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={triplet.object}
                                                        onChange={(e) => updateTripletField(index, 'object', e.target.value)}
                                                        className="w-full border-gray-300 border rounded px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="输入客体..."
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <button
                                                        onClick={() => removeTripletRow(index)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 图谱可视化页面 */}
            {activeTab === 'visualization' && (
                // <div className="bg-white rounded-lg shadow p-6">
                <div className="bg-white rounded-lg shadow p-6 relative">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">知识图谱可视化</h3>
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="搜索实体或关系..."
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleSearch}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
                            >
                                <Search className="h-4 w-4" />
                                <span>搜索</span>
                            </button>
                        </div>
                    </div>

                    {filteredGraphData.nodes.length > 0 ? (
                        // <div className="h-96 border border-gray-200 rounded-lg relative">
                        // <div className="h-[600px] border border-gray-200 rounded-lg relative overflow-hidden">
                        <div className="h-[600px] border border-gray-200 rounded-lg relative"> {/* 移除这里的 onContextMenu */}
                            <ForceGraph2D
                                ref={fgRef}
                                width={800} // 或者使用 ResizeObserver 动态获取容器宽度
                                height={600}
                                graphData={filteredGraphData}
                                nodeAutoColorBy="type"
                                nodeCanvasObject={(node, ctx, globalScale) => {
                                    const label = node.name;
                                    const fontSize = 12 / globalScale;
                                    ctx.font = `${fontSize}px Sans-Serif`;

                                    // 绘制节点
                                    ctx.fillStyle = node.color || '#3B82F6';
                                    ctx.beginPath();
                                    ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
                                    ctx.fill();

                                    // 绘制标签
                                    ctx.textAlign = 'center';
                                    ctx.textBaseline = 'middle';
                                    ctx.fillStyle = 'black';
                                    ctx.fillText(label, node.x, node.y + 10);
                                }}
                                linkDirectionalArrowLength={3.5}
                                linkDirectionalArrowRelPos={1}
                                linkCanvasObjectMode="after"
                                linkCanvasObject={(link, ctx) => {
                                    const MAX_FONT_SIZE = 4;
                                    const LABEL_NODE_MARGIN = 1.5;
                                    const start = link.source;
                                    const end = link.target;

                                    if (typeof start !== 'object' || typeof end !== 'object') return;

                                    const textPos = Object.assign({}, ...['x', 'y'].map(c => ({
                                        [c]: start[c] + (end[c] - start[c]) / 2
                                    })));

                                    const relLink = { x: end.x - start.x, y: end.y - start.y };
                                    const maxTextLength = Math.sqrt(Math.pow(relLink.x, 2) + Math.pow(relLink.y, 2)) - LABEL_NODE_MARGIN * 2;

                                    let textAngle = Math.atan2(relLink.y, relLink.x);
                                    if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
                                    if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

                                    const fontSize = Math.min(MAX_FONT_SIZE, maxTextLength / 8);
                                    ctx.font = `${fontSize}px Sans-Serif`;
                                    ctx.save();
                                    ctx.translate(textPos.x, textPos.y);
                                    ctx.rotate(textAngle);
                                    ctx.textAlign = 'center';
                                    ctx.textBaseline = 'middle';
                                    ctx.fillStyle = 'darkgrey';
                                    ctx.fillText(link.relation, 0, 0);
                                    ctx.restore();
                                }}
                                enableNodeDrag={true}
                                enableZoomInteraction={true}
                                enablePanInteraction={true}

                                onNodeClick={(node, event) => {
                                    // 阻止事件冒泡
                                    event.preventDefault();

                                    // 计算菜单位置（使用 clientX/Y 获取相对于窗口的位置）
                                    const { x, y } = getAdjustedPosition(event.clientX, event.clientY);
                                    setMenuPosition({ x, y });

                                    // 显示节点操作菜单
                                    setShowNodeActions(node.id);
                                    setShowLinkActions(null); // 关闭可能存在的关系菜单
                                }}

                                /* 同样修改关系的触发方式 */
                                onLinkClick={(link, event) => {
                                    event.preventDefault();

                                    const { x, y } = getAdjustedPosition(event.clientX, event.clientY);
                                    setMenuPosition({ x, y });

                                    setShowLinkActions(link.id);
                                    setShowNodeActions(null); // 关闭可能存在的节点菜单
                                }}

                                // 保留背景点击关闭菜单
                                onBackgroundClick={() => {
                                    setShowNodeActions(null);
                                    setShowLinkActions(null);
                                    setEditMode(false);
                                }}

                            />

                            {/* 节点操作菜单 */}
                            {showNodeActions && (
                                // <div
                                //     className="fixed bg-white p-2 rounded-lg shadow-xl border border-gray-200 w-40 z-50"
                                //     style={{
                                //         left: `${menuPosition.x}px`,
                                //         top: `${menuPosition.y}px`
                                //     }}
                                // >
                                <div
                                    className="fixed bg-white p-2 rounded-lg shadow-xl border border-gray-200 w-40 z-[9999]"
                                    style={{
                                        left: `${menuPosition.x}px`,
                                        top: `${menuPosition.y}px`,
                                        pointerEvents: 'auto' // 确保可点击
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <h4 className="text-xs font-bold text-gray-400 px-2 mb-2 uppercase tracking-wider">节点操作</h4>
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => editNode(filteredGraphData.nodes.find(n => n.id === showNodeActions))}
                                            className="w-full text-left hover:bg-blue-50 text-blue-600 px-3 py-2 rounded-md text-sm flex items-center space-x-2 transition-colors"
                                        >
                                            <Edit className="h-4 w-4" />
                                            <span>编辑名称</span>
                                        </button>
                                        <button
                                            onClick={() => deleteNode(showNodeActions)}
                                            className="w-full text-left hover:bg-red-50 text-red-600 px-3 py-2 rounded-md text-sm flex items-center space-x-2 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span>物理删除</span>
                                        </button>
                                    </div>
                                </div>

                            )}

                            {/* 关系操作菜单 */}
                            {showLinkActions && (
                                <div
                                    className="fixed bg-white p-2 rounded-lg shadow-xl border border-gray-200 w-40 z-[9999]"
                                    style={{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <h4 className="text-xs font-bold text-gray-400 px-2 mb-2 uppercase tracking-wider">关系操作</h4>
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => {
                                                const link = filteredGraphData.links.find(l => l.id === showLinkActions);
                                                editLink(link);
                                            }}
                                            className="w-full text-left hover:bg-blue-50 text-blue-600 px-3 py-2 rounded-md text-sm flex items-center space-x-2"
                                        >
                                            <Edit className="h-4 w-4" />
                                            <span>编辑关系</span>
                                        </button>
                                        <button
                                            onClick={() => deleteLink(showLinkActions)}
                                            className="w-full text-left hover:bg-red-50 text-red-600 px-3 py-2 rounded-md text-sm flex items-center space-x-2"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span>删除关系</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 编辑表单 */}
                            {editMode && (
                                <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 w-80">
                                    <h4 className="font-medium mb-3">
                                        {editMode === 'node' ? '编辑节点' : '编辑关系'}
                                    </h4>
                                    <div className="space-y-3">
                                        {editMode === 'node' ? (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">节点名称</label>
                                                <input
                                                    type="text"
                                                    value={editForm.subject}
                                                    onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">主体</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.subject}
                                                        onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">关系</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.predicate}
                                                        onChange={(e) => setEditForm({ ...editForm, predicate: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">客体</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.object}
                                                        onChange={(e) => setEditForm({ ...editForm, object: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </>
                                        )}
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={saveEdit}
                                                className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm"
                                            >
                                                保存
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditMode(false);
                                                    setSelectedNode(null);
                                                    setSelectedLink(null);
                                                }}
                                                className="bg-gray-300 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-400 text-sm"
                                            >
                                                取消
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 操作提示 */}
                            <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-75 text-white p-2 rounded text-xs">
                                <p>提示: 左键节点或关系进行操作</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-96 flex items-center justify-center text-gray-500">
                            <p>暂无图谱数据，请先录入关系数据</p>
                        </div>
                    )}
                </div>
            )}

            {/* 图谱记录页面 */}
            {activeTab === 'records' && (
                // <div className="bg-white rounded-lg shadow p-6">
                //     <h3 className="text-lg font-semibold mb-4">图谱记录</h3>

                //     <div className="space-y-4">
                //         <div className="border border-gray-200 rounded-lg p-4">
                //             <h4 className="font-medium mb-2">最近操作记录</h4>
                //             <div className="space-y-2">
                //                 <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                //                     <span className="text-sm">添加关系: 智能手机 - 属于 - 电子产品</span>
                //                     <span className="text-xs text-gray-500">2023-06-15 14:30</span>
                //                 </div>
                //                 <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                //                     <span className="text-sm">修改关系: iPhone - 品牌 - 苹果</span>
                //                     <span className="text-xs text-gray-500">2023-06-15 14:25</span>
                //                 </div>
                //                 <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                //                     <span className="text-sm">删除节点: 小米</span>
                //                     <span className="text-xs text-gray-500">2023-06-15 14:20</span>
                //                 </div>
                //             </div>
                //         </div>

                //         <div className="border border-gray-200 rounded-lg p-4">
                //             <h4 className="font-medium mb-2">数据统计</h4>
                //             <div className="grid grid-cols-3 gap-4">
                //                 <div className="text-center">
                //                     <p className="text-2xl font-bold text-blue-600">156</p>
                //                     <p className="text-sm text-gray-500">总实体数</p>
                //                 </div>
                //                 <div className="text-center">
                //                     <p className="text-2xl font-bold text-green-600">243</p>
                //                     <p className="text-sm text-gray-500">总关系数</p>
                //                 </div>
                //                 <div className="text-center">
                //                     <p className="text-2xl font-bold text-purple-600">12</p>
                //                     <p className="text-sm text-gray-500">今日操作</p>
                //                 </div>
                //             </div>
                //         </div>
                //     </div>
                // </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">图谱记录</h3>

                    <div className="space-y-4">
                        {/* 操作记录列表 */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-medium mb-2">最近操作记录</h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {operations.length > 0 ? operations.map((op) => (
                                    <div key={op.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border-l-4 border-blue-500">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">
                                                {op.operation_type === 'delete' && '🔴 删除'}
                                                {op.operation_type === 'edit' && '🟡 修改'}
                                                {op.operation_type === 'add' && '🟢 增加'}
                                                {op.entity_type === 'link' ? '关系' : '节点'}
                                            </span>

                                            <span className="text-xs text-gray-600">
                                                {op.subject} — [{op.predicate}] —&gt; {op.object}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {new Date(op.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                )) : (
                                    <div className="text-center py-4 text-gray-400 text-sm">暂无操作记录</div>
                                )}
                            </div>
                        </div>

                        {/* 联调统计卡片 */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-medium mb-2">数据统计</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <p className="text-2xl font-bold text-blue-600">{statistics.total_entities}</p>
                                    <p className="text-xs text-gray-500 uppercase">总实体数</p>
                                </div>
                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <p className="text-2xl font-bold text-green-600">{statistics.total_relations}</p>
                                    <p className="text-xs text-gray-500 uppercase">总关系数</p>
                                </div>
                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <p className="text-2xl font-bold text-purple-600">{statistics.today_operations}</p>
                                    <p className="text-xs text-gray-500 uppercase">今日操作</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KnowledgeGraph;