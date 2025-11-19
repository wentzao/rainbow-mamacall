// 配置檔案
const CONFIG = {
    // Socket.io 伺服器設定
    SOCKET_SERVER: 'https://rainbowstudent.wentzao.com',
    SOCKET_PATH: '/socket.io/',
    SOCKET_OPTIONS: {
        transports: ['websocket'],
        upgrade: false,
        rememberUpgrade: false,
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        forceNew: true
    },
    
    // LINE LIFF 設定
    LIFF_ID: '1655533540-PgQ1MEgK',
    
    // IP 白名單（免登入）
    IP_WHITELIST: ['114.33.21.210', '220.133.28.115'],
    
    // 預設語音模板
    DEFAULT_TEMPLATE_PICKUP: '{英文名} {中文名} 請準備',
    DEFAULT_TEMPLATE_ARRIVED: '{英文名} {中文名} 家長已到達',
    
    // 字體大小設定
    FONT_SIZE: {
        MIN: 4,
        MAX: 48,
        STEP: 4,
        DEFAULT: 16
    },
    
    // 語速設定
    SPEECH_RATE: {
        MIN: 0.5,
        MAX: 2,
        DEFAULT: 1
    },
    
    // 心跳包間隔（毫秒）
    PING_INTERVAL: 30000
};

// 匯出配置（如果使用模組系統）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

