const express = require('express');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 模拟区块链数据
let blocks = [];
let transactions = [];
let validators = [];
let networkStats = {
  totalBlocks: 0,
  totalTransactions: 0,
  activeValidators: 0,
  networkHashRate: '1.2 TH/s',
  avgBlockTime: '12.5s'
};

// 初始化模拟数据
function initializeData() {
  console.log('正在初始化区块链数据...');
  
  // 生成模拟验证者
  for (let i = 0; i < 10; i++) {
    validators.push({
      id: i + 1,
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      name: `Validator ${i + 1}`,
      stake: Math.floor(Math.random() * 1000000) + 100000,
      status: Math.random() > 0.2 ? 'active' : 'inactive',
      uptime: Math.floor(Math.random() * 100),
      lastSeen: new Date()
    });
  }
  console.log(`已生成 ${validators.length} 个验证者`);

  // 生成模拟区块
  for (let i = 0; i < 50; i++) {
    const block = {
      number: i + 1,
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      timestamp: new Date(Date.now() - i * 12000),
      validator: validators[Math.floor(Math.random() * validators.length)].address,
      transactionCount: Math.floor(Math.random() * 20) + 1,
      gasUsed: Math.floor(Math.random() * 8000000) + 1000000,
      gasLimit: 8000000,
      size: Math.floor(Math.random() * 50000) + 10000
    };
    blocks.unshift(block);
  }

  // 生成模拟交易
  blocks.forEach(block => {
    for (let i = 0; i < block.transactionCount; i++) {
      transactions.push({
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        blockNumber: block.number,
        from: `0x${Math.random().toString(16).substr(2, 40)}`,
        to: `0x${Math.random().toString(16).substr(2, 40)}`,
        value: Math.random() * 10,
        gasPrice: Math.floor(Math.random() * 50) + 10,
        gasUsed: Math.floor(Math.random() * 100000) + 21000,
        status: Math.random() > 0.1 ? 'success' : 'failed',
        timestamp: block.timestamp
      });
    }
  });

  networkStats.totalBlocks = blocks.length;
  networkStats.totalTransactions = transactions.length;
  networkStats.activeValidators = validators.filter(v => v.status === 'active').length;
  
  console.log(`数据初始化完成:`);
  console.log(`- 区块数: ${networkStats.totalBlocks}`);
  console.log(`- 交易数: ${networkStats.totalTransactions}`);
  console.log(`- 活跃验证者: ${networkStats.activeValidators}`);
  console.log('GenLayer区块链浏览器数据准备就绪!');
}

// API 路由
app.get('/api/blocks', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // 限制最大100条
    const start = (page - 1) * limit;
    const end = start + limit;
    
    console.log(`API请求: /api/blocks - 页码:${page}, 限制:${limit}`);
    
    res.json({
      blocks: blocks.slice(start, end),
      total: blocks.length,
      page,
      totalPages: Math.ceil(blocks.length / limit)
    });
  } catch (error) {
    console.error('获取区块列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/blocks/:number', (req, res) => {
  const blockNumber = parseInt(req.params.number);
  const block = blocks.find(b => b.number === blockNumber);
  
  if (!block) {
    return res.status(404).json({ error: 'Block not found' });
  }
  
  const blockTransactions = transactions.filter(t => t.blockNumber === blockNumber);
  res.json({ ...block, transactions: blockTransactions });
});

app.get('/api/transactions', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // 限制最大100条
    const start = (page - 1) * limit;
    const end = start + limit;
    
    console.log(`API请求: /api/transactions - 页码:${page}, 限制:${limit}`);
    
    res.json({
      transactions: transactions.slice(start, end),
      total: transactions.length,
      page,
      totalPages: Math.ceil(transactions.length / limit)
    });
  } catch (error) {
    console.error('获取交易列表失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/transactions/:hash', (req, res) => {
  const transaction = transactions.find(t => t.hash === req.params.hash);
  
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  res.json(transaction);
});

app.get('/api/validators', (req, res) => {
  res.json(validators);
});

app.get('/api/stats', (req, res) => {
  res.json(networkStats);
});

// WebSocket 连接处理实时数据
io.on('connection', (socket) => {
  console.log(`客户端已连接 [${socket.id}]`);
  
  // 立即发送当前统计数据
  socket.emit('stats', networkStats);
  
  // 发送实时统计数据
  const statsInterval = setInterval(() => {
    // 模拟数据变化
    networkStats.networkHashRate = `${(1.0 + Math.random() * 0.5).toFixed(1)} TH/s`;
    networkStats.avgBlockTime = `${(12 + Math.random() * 2).toFixed(1)}s`;
    
    socket.emit('stats', networkStats);
  }, 5000);
  
  socket.on('disconnect', () => {
    console.log(`客户端已断开 [${socket.id}]`);
    clearInterval(statsInterval);
  });
});

// 提供静态文件
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`GenLayer区块链浏览器运行在端口 ${PORT}`);
  initializeData();
});