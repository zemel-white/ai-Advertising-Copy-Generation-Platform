import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Square, FileText, Database,
  Terminal, Server, ChevronDown, ChevronRight, Trash2,
} from "lucide-react";

// ANSI 转义码剥离
function stripAnsi(str) {
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

// WebSocket 连接地址
const WS_URL = "ws://localhost:8001/ws/train";

const ModelTraining = () => {
  const [activeModelType, setActiveModelType] = useState("generation");
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState("");

  // SSH 配置（按模型类型分开）
  const [genSshConfig, setGenSshConfig] = useState({
    host: "ssh.zw1.paratera.com",
    port: 2222,
    username: "root@ackcs-00gjgtz2",
    password: "12e4af92dc9df45cdf99716e801e8962",
  });
  const [retSshConfig, setRetSshConfig] = useState({
    host: "ssh.zw1.paratera.com",
    port: 2222,
    username: "root@ackcs-00gjgumv",
    password: "556f33bc325dbfdb6317e405f0e1b8b2",
  });
  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // disconnected | connecting | connected
  const [trainingLogs, setTrainingLogs] = useState([]);
  const [showSshConfig, setShowSshConfig] = useState(false);
  const activeSshConfig = activeModelType === "generation" ? genSshConfig : retSshConfig;
  const setActiveSshConfig = activeModelType === "generation" ? setGenSshConfig : setRetSshConfig;

  const wsRef = useRef(null);
  const logsEndRef = useRef(null);

  // 数据集
  const [datasets, setDatasets] = useState({
    train: null,
    validation: null,
    test: null,
  });

  // 生成模型配置
  const [generationConfig, setGenerationConfig] = useState({
    num_epoch: 10,
    learning_rate: 0.001,
    save_dir: "./models/generation",
    batch_size: 32,
    save_steps: 1000,
    top_k: 50,
    latent_space: 512,
  });

  // 检索模型配置
  const [retrievalConfig, setRetrievalConfig] = useState({
    num_epoch: 10,
    learning_rate: 0.001,
    save_dir: "./models/retrieval",
    batch_size: 32,
    save_steps: 1000,
    top_k: 50,
    hidden_dims: 256,
  });

  // 自动滚动日志到底部
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [trainingLogs]);

  const handleFileUpload = (type, file) => {
    setDatasets((prev) => ({ ...prev, [type]: file }));
  };

  const addLog = useCallback((entry) => {
    setTrainingLogs((prev) => [...prev, { ...entry, timestamp: new Date().toLocaleTimeString() }]);
  }, []);

  const startTraining = useCallback(() => {
    const config = activeModelType === "generation" ? genSshConfig : retSshConfig;
    if (!config.host || !config.password) {
      addLog({ type: "error", stream: null, message: "请先配置 SSH 连接信息（主机和密码）" });
      setShowSshConfig(true);
      return;
    }

    setIsTraining(true);
    setConnectionStatus("connecting");
    setTrainingProgress(0);
    setEstimatedTime("");
    setTrainingLogs([]);
    addLog({ type: "status", stream: null, message: `正在连接 ${activeModelType === "generation" ? "生成模型" : "检索模型"} 容器...` });

    const payload = { ...config, model_type: activeModelType };

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      addLog({ type: "status", stream: null, message: "WebSocket 已连接，发送 SSH 配置..." });
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "status":
            setConnectionStatus("connected");
            addLog({ type: "status", stream: null, message: data.message });
            break;

          case "log": {
            const cleanMsg = stripAnsi(data.message);
            if (cleanMsg.trim()) {
              addLog({ type: "log", stream: data.stream, message: cleanMsg });
            }
            break;
          }

          case "error":
            addLog({ type: "error", stream: null, message: data.message });
            setConnectionStatus("disconnected");
            setIsTraining(false);
            break;

          case "complete":
            addLog({
              type: "status",
              stream: null,
              message: `训练进程结束，退出码: ${data.exit_code}`,
            });
            setTrainingProgress(100);
            setConnectionStatus("disconnected");
            setIsTraining(false);
            break;
        }
      } catch (err) {
        addLog({ type: "error", stream: null, message: `解析消息失败: ${err.message}` });
      }
    };

    ws.onerror = () => {
      addLog({ type: "error", stream: null, message: "WebSocket 连接失败，请确保后端服务已启动 (python server/main.py)" });
      setConnectionStatus("disconnected");
      setIsTraining(false);
    };

    ws.onclose = () => {
      if (isTraining) {
        addLog({ type: "status", stream: null, message: "连接已断开" });
        setConnectionStatus("disconnected");
        setIsTraining(false);
      }
    };
  }, [genSshConfig, retSshConfig, activeModelType, addLog, isTraining]);

  const stopTraining = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.send("stop");
      } catch (e) {
        // ignore
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    addLog({ type: "status", stream: null, message: "训练已手动停止" });
    setConnectionStatus("disconnected");
    setIsTraining(false);
  }, [addLog]);

  // 清除日志
  const clearLogs = () => {
    setTrainingLogs([]);
  };

  const currentConfig = activeModelType === "generation" ? generationConfig : retrievalConfig;
  const setCurrentConfig = activeModelType === "generation" ? setGenerationConfig : setRetrievalConfig;

  // 连接状态样式
  const statusStyles = {
    disconnected: { dot: "bg-gray-400", text: "未连接" },
    connecting: { dot: "bg-yellow-400 animate-pulse", text: "连接中..." },
    connected: { dot: "bg-green-500", text: "已连接" },
  };
  const status = statusStyles[connectionStatus];

  return (
    <div className="space-y-4">
      {/* 顶部标题栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-bold text-gray-800">模型训练</h2>
          {/* 连接状态指示器 */}
          <div className="flex items-center space-x-1.5 text-sm text-gray-500">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${status.dot}`} />
            <span>{status.text}</span>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setActiveModelType("generation")}
            className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
              activeModelType === "generation"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <FileText className="h-5 w-5" />
            <span>生成模型</span>
          </button>
          <button
            onClick={() => setActiveModelType("retrieval")}
            className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
              activeModelType === "retrieval"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <Database className="h-5 w-5" />
            <span>检索模型</span>
          </button>
        </div>
      </div>

      {/* SSH 连接配置（可折叠） */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => setShowSshConfig(!showSshConfig)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center space-x-2">
            <Server className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold">
              SSH 云容器连接
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({activeModelType === "generation" ? "生成模型" : "检索模型"})
              </span>
            </h3>
          </div>
          {showSshConfig ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {showSshConfig && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 mt-3 mb-4">
              配置 <span className="font-semibold text-gray-700">{activeModelType === "generation" ? "生成模型" : "检索模型"}</span> 的远程训练服务器 SSH 连接。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  主机地址 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例如: 192.168.1.100"
                  value={activeSshConfig.host}
                  onChange={(e) =>
                    setActiveSshConfig({ ...activeSshConfig, host: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  端口
                </label>
                <input
                  type="number"
                  value={activeSshConfig.port}
                  onChange={(e) =>
                    setActiveSshConfig({ ...activeSshConfig, port: parseInt(e.target.value) || 22 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  placeholder="root"
                  value={activeSshConfig.username}
                  onChange={(e) =>
                    setActiveSshConfig({ ...activeSshConfig, username: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="SSH 密码"
                  value={activeSshConfig.password}
                  onChange={(e) =>
                    setActiveSshConfig({ ...activeSshConfig, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 数据集上传 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">数据集上传</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["train", "validation", "test"].map((type) => (
            <div key={type} className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {type === "train"
                  ? "训练集"
                  : type === "validation"
                  ? "验证集"
                  : "测试集"}
              </label>
              <input
                type="file"
                onChange={(e) => handleFileUpload(type, e.target.files[0])}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {datasets[type] && (
                <p className="mt-2 text-sm text-green-600">
                  已上传: {datasets[type].name}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 训练配置 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">训练配置</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              训练轮数 (num_epoch)
            </label>
            <input
              type="number"
              value={currentConfig.num_epoch}
              onChange={(e) =>
                setCurrentConfig({ ...currentConfig, num_epoch: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              学习率 (learning_rate)
            </label>
            <input
              type="number"
              step="0.0001"
              value={currentConfig.learning_rate}
              onChange={(e) =>
                setCurrentConfig({ ...currentConfig, learning_rate: parseFloat(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              保存目录
            </label>
            <input
              type="text"
              value={currentConfig.save_dir}
              onChange={(e) =>
                setCurrentConfig({ ...currentConfig, save_dir: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              批次大小 (batch_size)
            </label>
            <input
              type="number"
              value={currentConfig.batch_size}
              onChange={(e) =>
                setCurrentConfig({ ...currentConfig, batch_size: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              保存步数 (save_steps)
            </label>
            <input
              type="number"
              value={currentConfig.save_steps}
              onChange={(e) =>
                setCurrentConfig({ ...currentConfig, save_steps: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Top-K
            </label>
            <input
              type="number"
              value={currentConfig.top_k}
              onChange={(e) =>
                setCurrentConfig({ ...currentConfig, top_k: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {activeModelType === "generation" ? "潜在空间" : "隐藏维度"}
            </label>
            <input
              type="number"
              value={
                activeModelType === "generation"
                  ? currentConfig.latent_space
                  : currentConfig.hidden_dims
              }
              onChange={(e) =>
                setCurrentConfig({
                  ...currentConfig,
                  [activeModelType === "generation" ? "latent_space" : "hidden_dims"]:
                    parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 训练控制 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">训练控制</h3>

        {/* 进度条 */}
        {isTraining && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>训练进度</span>
              <span>{Math.round(trainingProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${trainingProgress}%` }}
              ></div>
            </div>
            {estimatedTime && (
              <p className="text-sm text-gray-600 mt-1">
                预估剩余时间: {estimatedTime}
              </p>
            )}
          </div>
        )}

        <div className="flex space-x-3 mb-4">
          <button
            onClick={startTraining}
            disabled={isTraining}
            className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
              isTraining
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            } text-white`}
          >
            <Play className="h-5 w-5" />
            <span>开始训练</span>
          </button>

          <button
            onClick={stopTraining}
            disabled={!isTraining}
            className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
              !isTraining
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            } text-white`}
          >
            <Square className="h-5 w-5" />
            <span>停止训练</span>
          </button>
        </div>
      </div>

      {/* 训练日志 */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <Terminal className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold">训练日志</h3>
            <span className="text-xs text-gray-400">
              {trainingLogs.length} 条
            </span>
          </div>
          {trainingLogs.length > 0 && (
            <button
              onClick={clearLogs}
              className="text-sm text-gray-500 hover:text-red-600 flex items-center space-x-1"
            >
              <Trash2 className="h-4 w-4" />
              <span>清空</span>
            </button>
          )}
        </div>

        <div className="h-80 overflow-y-auto p-4 bg-gray-900 text-gray-100 font-mono text-xs leading-relaxed">
          {trainingLogs.length === 0 ? (
            <p className="text-gray-500 italic">
              暂无日志，点击"开始训练"连接远程容器执行训练任务
            </p>
          ) : (
            trainingLogs.map((entry, idx) => {
              let color = "text-gray-100";
              if (entry.type === "status") {
                color = "text-blue-400";
              } else if (entry.type === "error") {
                color = "text-red-400";
              } else if (entry.stream === "stderr") {
                color = "text-yellow-300";
              }

              return (
                <div key={idx} className={`${color} whitespace-pre-wrap break-all`}>
                  <span className="text-gray-500 mr-2">[{entry.timestamp}]</span>
                  {entry.message}
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default ModelTraining;
