// Socket.io 連接與事件處理
let socket = null;
window.socket = null; // 供其他模組檢查

// 初始化 Socket.io 連接
function initializeSocket() {
    const socketOptions = {
        ...CONFIG.SOCKET_OPTIONS,
        auth: {
            userId: getUserId()
        }
    };
    
    socket = io(CONFIG.SOCKET_SERVER, {
        path: CONFIG.SOCKET_PATH,
        ...socketOptions
    });
    window.socket = socket; // 供其他模組使用

    // 連接狀態監控
    socket.on('connect', () => {
        console.log('已連接到伺服器');
        console.log('Transport type:', socket.io.engine.transport.name);
        console.log('Protocol:', socket.io.engine.transport.ws ? 'WebSocket' : 'HTTP');
    });

    socket.on('connect_error', (error) => {
        console.error('連接錯誤:', error);
        console.log('嘗試重新連接...');
        // 如果 WebSocket 失敗，嘗試使用輪詢
        if (socket.io.engine && socket.io.engine.transport.name === 'websocket') {
            console.log('WebSocket 連接失敗，切換到輪詢模式');
            socket.io.opts.transports = ['polling', 'websocket'];
        }
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`嘗試重新連接 (${attemptNumber}/10)...`);
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log(`重新連接成功 (嘗試次數: ${attemptNumber})`);
    });

    socket.on('reconnect_failed', () => {
        console.error('重新連接失敗，已達到最大嘗試次數');
    });

    socket.on('disconnect', (reason) => {
        console.log('與伺服器斷開連接，原:', reason);
        if (reason === 'io server disconnect') {
            // 服務器主動斷開連接，需手動重連
            socket.connect();
        }
        // 其他情況會自動嘗試重連
    });

    // 定期發送心跳包檢查連接狀態
    setInterval(() => {
        if (socket.connected) {
            socket.emit('ping');
        } else {
            console.log('當前未連接到服務器');
        }
    }, CONFIG.PING_INTERVAL);

    socket.on('pong', () => {
        console.log('服務器回應心跳包');
    });

    // 監聽刪除錯誤
    socket.on('delete_error', (error) => {
        console.error('刪除失敗:', error);
        alert('刪除失敗，請稍後再試');
    });

    return socket;
}

// 發送瀏覽器通知
function sendBrowserNotification(title, options = {}) {
    if ("Notification" in window && Notification.permission === "granted") {
        try {
            const notification = new Notification(title, {
                icon: './notification-icon-192x192.png',
                badge: './notification-icon-72x72.png',
                ...options
            });

            // 點擊通知時打開/聚焦網頁
            notification.onclick = () => {
                window.focus();
            };
        } catch (error) {
            console.error('發送通知失敗:', error);
        }
    }
}

// 取得 Socket 實例
function getSocket() {
    return socket;
}

