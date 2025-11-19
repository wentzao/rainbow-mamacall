// LINE 登入相關功能
let userId = null;

// 初始化 LIFF
async function initializeLiff() {
    try {
        await liff.init({ liffId: CONFIG.LIFF_ID });
        console.log('LIFF 初始化成功');
        
        // 請求通知權限
        if ("Notification" in window) {
            const permission = await Notification.requestPermission();
            console.log('通知權限狀態:', permission);
        }

        // 檢查是否在 LIFF 環境中
        if (liff.isInClient()) {
            // 在 LIFF 瀏覽器中，直接取得用戶資料
            handleLineLogin();
        } else {
            // 在外部瀏覽器中，先檢查 IP
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                if (CONFIG.IP_WHITELIST.includes(data.ip)) {
                    // 特定 IP，直接關閉登入覆蓋層並設置預設頭像
                    document.getElementById('lineLoginOverlay').style.display = 'none';
                    document.getElementById('profileImage').src = './notification-icon-192x192.png';
                    // 顯示導航欄（在桌面版）
                    if (window.innerWidth > 768) {
                        document.querySelector('.navbar').style.display = 'flex';
                    }
                    // 顯示連接伺服器覆蓋層
                    document.getElementById('overlay').style.display = 'flex';
                    // IP 白名單通過後也要初始化 Socket
                    if (typeof initializeSocket === 'function' && !window.socket) {
                        initializeSocket();
                        if (typeof setupSocketEvents === 'function') {
                            setupSocketEvents();
                        }
                    }
                } else {
                    // 非特定 IP，檢查是否已登入
                    if (liff.isLoggedIn()) {
                        handleLineLogin();
                    } else {
                        // 只在外部瀏覽器才顯示登入按鈕
                        document.getElementById('lineLoginOverlay').style.display = 'flex';
                        document.getElementById('lineLoginButton').style.display = 'block';
                        document.getElementById('lineLoginButton').addEventListener('click', () => {
                            liff.login();
                        });
                    }
                }
            } catch (error) {
                console.error('IP 檢查失敗:', error);
                // IP 檢查失敗時回退到標準 LINE 登入流程
                if (liff.isLoggedIn()) {
                    handleLineLogin();
                } else {
                    document.getElementById('lineLoginOverlay').style.display = 'flex';
                    document.getElementById('lineLoginButton').style.display = 'block';
                    document.getElementById('lineLoginButton').addEventListener('click', () => {
                        liff.login();
                    });
                }
            }
        }
    } catch (error) {
        console.error('LIFF 初始化失敗:', error);
        alert('LINE 登入服務暫時無法使用，請稍後再試');
    }
}

// 處理 LINE 登入成功
async function handleLineLogin() {
    try {
        const profile = await liff.getProfile();
        userId = profile.userId;
        console.log('LINE 登入成功, userId:', userId);
        
        // 設置用戶頭像
        document.getElementById('profileImage').src = profile.pictureUrl;
        
        // 顯示導航欄（在桌面版）
        if (window.innerWidth > 768) {
            document.querySelector('.navbar').style.display = 'flex';
        }
        
        // 隱藏登入覆蓋層（如果存在）
        const loginOverlay = document.getElementById('lineLoginOverlay');
        if (loginOverlay) {
            loginOverlay.style.display = 'none';
        }

        // 顯示連接伺服器覆蓋層
        document.getElementById('overlay').style.display = 'flex';
        
        // 登入成功後初始化 Socket
        if (typeof initializeSocket === 'function' && !window.socket) {
            initializeSocket();
            if (typeof setupSocketEvents === 'function') {
                setupSocketEvents();
            }
        }
        
    } catch (error) {
        console.error('獲取用戶資料失敗:', error);
        alert('無法獲取用戶資料，請重新登入');
    }
}

// 登出功能
async function handleLogout() {
    try {
        if (!liff.isInClient()) {
            // 只在外部瀏覽器中才需要登出
            await liff.logout();
        }
        // 重新載入頁面
        window.location.reload();
    } catch (error) {
        console.error('登出失敗:', error);
        alert('登出失敗，請稍後再試');
    }
}

// 取得當前用戶 ID
function getUserId() {
    return userId;
}

