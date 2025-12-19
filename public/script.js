// 全局变量
let currentPage = {
    blocks: 1,
    transactions: 1
};

let socket;

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupNavigation();
    setupWebSocket();
    loadDashboard();
});

// 初始化应用
function initializeApp() {
    console.log('GenLayer区块链浏览器已启动');
}

// 设置导航
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 移除所有活跃状态
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // 添加活跃状态
            link.classList.add('active');
            const sectionId = link.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
            
            // 加载对应数据
            switch(sectionId) {
                case 'dashboard':
                    loadDashboard();
                    break;
                case 'blocks':
                    loadBlocks();
                    break;
                case 'transactions':
                    loadTransactions();
                    break;
                case 'validators':
                    loadValidators();
                    break;
            }
        });
    });
}

// 设置WebSocket连接
function setupWebSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('WebSocket连接已建立');
        updateConnectionStatus(true);
        showSuccessMessage('实时连接已建立');
    });
    
    socket.on('stats', (data) => {
        updateNetworkStats(data);
    });
    
    socket.on('disconnect', () => {
        console.log('WebSocket连接已断开');
        updateConnectionStatus(false);
        showErrorMessage('实时连接已断开');
    });
    
    socket.on('connect_error', (error) => {
        console.error('WebSocket连接错误:', error);
        updateConnectionStatus(false);
        showErrorMessage('连接服务器失败');
    });
}

// 更新连接状态
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connection-status');
    if (connected) {
        statusElement.className = 'connection-status connected';
        statusElement.querySelector('span').textContent = '实时连接';
    } else {
        statusElement.className = 'connection-status disconnected';
        statusElement.querySelector('span').textContent = '连接断开';
    }
}

// 更新网络统计数据
function updateNetworkStats(stats) {
    document.getElementById('total-blocks').textContent = stats.totalBlocks.toLocaleString();
    document.getElementById('total-transactions').textContent = stats.totalTransactions.toLocaleString();
    document.getElementById('active-validators').textContent = stats.activeValidators;
    document.getElementById('network-hashrate').textContent = stats.networkHashRate;
}

// 加载仪表板
async function loadDashboard() {
    try {
        console.log('正在加载仪表板数据...');
        
        // 加载网络统计
        const statsResponse = await fetch('/api/stats');
        if (!statsResponse.ok) throw new Error(`统计数据加载失败: ${statsResponse.status}`);
        const stats = await statsResponse.json();
        updateNetworkStats(stats);
        
        // 加载最新区块
        const blocksResponse = await fetch('/api/blocks?limit=5');
        if (!blocksResponse.ok) throw new Error(`区块数据加载失败: ${blocksResponse.status}`);
        const blocksData = await blocksResponse.json();
        displayRecentBlocks(blocksData.blocks);
        
        // 加载最新交易
        const transactionsResponse = await fetch('/api/transactions?limit=5');
        if (!transactionsResponse.ok) throw new Error(`交易数据加载失败: ${transactionsResponse.status}`);
        const transactionsData = await transactionsResponse.json();
        displayRecentTransactions(transactionsData.transactions);
        
        console.log('仪表板数据加载完成');
        
    } catch (error) {
        console.error('加载仪表板数据失败:', error);
        showErrorMessage('加载仪表板数据失败，请刷新页面重试');
    }
}

// 显示最新区块
function displayRecentBlocks(blocks) {
    const tbody = document.querySelector('#recent-blocks-table tbody');
    tbody.innerHTML = '';
    
    blocks.forEach(block => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="hash" onclick="viewBlock(${block.number})">#${block.number}</span></td>
            <td>${formatTime(block.timestamp)}</td>
            <td>${block.transactionCount}</td>
            <td><span class="hash">${formatAddress(block.validator)}</span></td>
            <td>${formatGas(block.gasUsed)}</td>
        `;
        tbody.appendChild(row);
    });
}

// 显示最新交易
function displayRecentTransactions(transactions) {
    const tbody = document.querySelector('#recent-transactions-table tbody');
    tbody.innerHTML = '';
    
    transactions.forEach(tx => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="hash" onclick="viewTransaction('${tx.hash}')">${formatHash(tx.hash)}</span></td>
            <td><span class="hash">${formatAddress(tx.from)}</span></td>
            <td><span class="hash">${formatAddress(tx.to)}</span></td>
            <td>${tx.value.toFixed(4)} ETH</td>
            <td><span class="status-${tx.status}">${tx.status === 'success' ? '成功' : '失败'}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// 加载区块列表
async function loadBlocks(page = 1) {
    try {
        showLoading('blocks-table');
        const response = await fetch(`/api/blocks?page=${page}&limit=20`);
        const data = await response.json();
        
        displayBlocks(data.blocks);
        createPagination('blocks-pagination', data.page, data.totalPages, loadBlocks);
        currentPage.blocks = page;
        
    } catch (error) {
        console.error('加载区块数据失败:', error);
    }
}

// 显示区块列表
function displayBlocks(blocks) {
    const tbody = document.querySelector('#blocks-table tbody');
    tbody.innerHTML = '';
    
    blocks.forEach(block => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="hash" onclick="viewBlock(${block.number})">#${block.number}</span></td>
            <td><span class="hash">${formatHash(block.hash)}</span></td>
            <td>${formatTime(block.timestamp)}</td>
            <td>${block.transactionCount}</td>
            <td><span class="hash">${formatAddress(block.validator)}</span></td>
            <td>${formatGas(block.gasUsed)} / ${formatGas(block.gasLimit)}</td>
            <td>${formatBytes(block.size)}</td>
        `;
        tbody.appendChild(row);
    });
}

// 加载交易列表
async function loadTransactions(page = 1) {
    try {
        showLoading('transactions-table');
        const response = await fetch(`/api/transactions?page=${page}&limit=20`);
        const data = await response.json();
        
        displayTransactions(data.transactions);
        createPagination('transactions-pagination', data.page, data.totalPages, loadTransactions);
        currentPage.transactions = page;
        
    } catch (error) {
        console.error('加载交易数据失败:', error);
    }
}

// 显示交易列表
function displayTransactions(transactions) {
    const tbody = document.querySelector('#transactions-table tbody');
    tbody.innerHTML = '';
    
    transactions.forEach(tx => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="hash" onclick="viewTransaction('${tx.hash}')">${formatHash(tx.hash)}</span></td>
            <td><span class="hash" onclick="viewBlock(${tx.blockNumber})">#${tx.blockNumber}</span></td>
            <td><span class="hash">${formatAddress(tx.from)}</span></td>
            <td><span class="hash">${formatAddress(tx.to)}</span></td>
            <td>${tx.value.toFixed(4)} ETH</td>
            <td>${tx.gasPrice} Gwei</td>
            <td><span class="status-${tx.status}">${tx.status === 'success' ? '成功' : '失败'}</span></td>
            <td>${formatTime(tx.timestamp)}</td>
        `;
        tbody.appendChild(row);
    });
}

// 加载验证者列表
async function loadValidators() {
    try {
        const response = await fetch('/api/validators');
        const validators = await response.json();
        displayValidators(validators);
    } catch (error) {
        console.error('加载验证者数据失败:', error);
    }
}

// 显示验证者列表
function displayValidators(validators) {
    const container = document.getElementById('validators-grid');
    container.innerHTML = '';
    
    validators.forEach(validator => {
        const card = document.createElement('div');
        card.className = 'validator-card';
        card.innerHTML = `
            <div class="validator-header">
                <div class="validator-name">${validator.name}</div>
                <div class="validator-status status-${validator.status}">${validator.status === 'active' ? '活跃' : '非活跃'}</div>
            </div>
            <div class="validator-info">
                <div>
                    <span class="label">地址:</span>
                    <span class="value hash">${formatAddress(validator.address)}</span>
                </div>
                <div>
                    <span class="label">质押:</span>
                    <span class="value">${validator.stake.toLocaleString()} ETH</span>
                </div>
                <div>
                    <span class="label">正常运行时间:</span>
                    <span class="value">${validator.uptime}%</span>
                </div>
                <div>
                    <span class="label">最后活跃:</span>
                    <span class="value">${formatTime(validator.lastSeen)}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// 搜索区块
async function searchBlock() {
    const searchInput = document.getElementById('block-search');
    const query = searchInput.value.trim();
    
    if (!query) return;
    
    try {
        const response = await fetch(`/api/blocks/${query}`);
        if (response.ok) {
            const block = await response.json();
            viewBlockDetails(block);
        } else {
            alert('未找到指定区块');
        }
    } catch (error) {
        console.error('搜索区块失败:', error);
        alert('搜索失败');
    }
}

// 搜索交易
async function searchTransaction() {
    const searchInput = document.getElementById('transaction-search');
    const query = searchInput.value.trim();
    
    if (!query) return;
    
    try {
        const response = await fetch(`/api/transactions/${query}`);
        if (response.ok) {
            const transaction = await response.json();
            viewTransactionDetails(transaction);
        } else {
            alert('未找到指定交易');
        }
    } catch (error) {
        console.error('搜索交易失败:', error);
        alert('搜索失败');
    }
}

// 查看区块详情
function viewBlock(blockNumber) {
    // 这里可以实现区块详情模态框或跳转到详情页
    alert(`查看区块 #${blockNumber} 详情`);
}

// 查看交易详情
function viewTransaction(txHash) {
    // 这里可以实现交易详情模态框或跳转到详情页
    alert(`查看交易 ${formatHash(txHash)} 详情`);
}

// 查看区块详情
function viewBlockDetails(block) {
    alert(`区块详情:\n区块号: ${block.number}\n哈希: ${block.hash}\n交易数: ${block.transactions.length}`);
}

// 查看交易详情
function viewTransactionDetails(transaction) {
    alert(`交易详情:\n哈希: ${transaction.hash}\n从: ${transaction.from}\n到: ${transaction.to}\n金额: ${transaction.value} ETH`);
}

// 创建分页
function createPagination(containerId, currentPage, totalPages, loadFunction) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一页';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => loadFunction(currentPage - 1);
    container.appendChild(prevBtn);
    
    // 页码按钮
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => loadFunction(i);
        container.appendChild(pageBtn);
    }
    
    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => loadFunction(currentPage + 1);
    container.appendChild(nextBtn);
}

// 显示加载状态
function showLoading(tableId) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '<tr><td colspan="100%" class="loading"><div class="spinner"></div></td></tr>';
}

// 工具函数
function formatHash(hash) {
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
}

function formatAddress(address) {
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
}

function formatGas(gas) {
    return (gas / 1000000).toFixed(2) + 'M';
}

function formatBytes(bytes) {
    return (bytes / 1024).toFixed(1) + ' KB';
}

// 显示错误消息
function showErrorMessage(message) {
    // 创建错误提示元素
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    // 添加到页面顶部
    document.body.insertBefore(errorDiv, document.body.firstChild);
    
    // 3秒后自动消失
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 3000);
}

// 显示成功消息
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.insertBefore(successDiv, document.body.firstChild);
    
    setTimeout(() => {
        if (successDiv.parentElement) {
            successDiv.remove();
        }
    }, 3000);
}