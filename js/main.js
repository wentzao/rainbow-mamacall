// 主初始化檔案
let broadcastTemplatePickup = CONFIG.DEFAULT_TEMPLATE_PICKUP;
let broadcastTemplateArrived = CONFIG.DEFAULT_TEMPLATE_ARRIVED;

// 初始化所有模組
function initializeApp() {
    // 初始化時鐘
    initializeClock();
    
    // 初始化字體大小
    initializeFontSize();
    
    // 初始化音效
    const audio = initializeAudio();
    
    // 初始化語音合成
    initializeSpeech();
    
    // 初始化 UI 控制
    initializeUIControls();
    
    // 初始化模板按鈕
    initializeTemplateButtons();
    
    // 初始化手機版滑動切換
    initializeMobileSwipe();
    
    // 初始化 Socket.io（在登入後）
    // 注意：Socket 初始化會在 handleLineLogin 或 IP 白名單通過後進行
    
    // 初始化語音設置
    if (speechSynth) {
        speechSynth.onvoiceschanged = () => {
            voices = speechSynth.getVoices();
            updateVoiceSelects();
            loadSavedSettings();
        };
        voices = speechSynth.getVoices();
        updateVoiceSelects();
        const saved = loadSavedSettings();
        broadcastTemplatePickup = saved.broadcastTemplatePickup || CONFIG.DEFAULT_TEMPLATE_PICKUP;
        broadcastTemplateArrived = saved.broadcastTemplateArrived || CONFIG.DEFAULT_TEMPLATE_ARRIVED;
    }
    
    // 設置 Modal 控制
    const settingsModal = document.getElementById('settingsModal');
    const settingsButton = document.getElementById('settingsButton');
    const closeModal = document.querySelector('.close-modal');
    const saveSettingsBtn = document.querySelector('.save-settings');
    
    if (settingsButton) {
        settingsButton.onclick = () => {
            if (settingsModal) settingsModal.style.display = 'block';
            const dropdownMenu = document.getElementById('dropdownMenu');
            if (dropdownMenu) dropdownMenu.classList.remove('show');
            
            // 重新載入已保存的設置
            const savedSettings = JSON.parse(localStorage.getItem('voiceSettings') || '{}');
            
            const chineseSelect = document.getElementById('chineseVoiceSelect');
            const englishSelect = document.getElementById('englishVoiceSelect');
            const rateRange = document.getElementById('rateRange');
            const rateValue = document.getElementById('rateValue');
            const tplPickup = document.getElementById('broadcastTemplatePickup');
            const tplArrived = document.getElementById('broadcastTemplateArrived');
            
            if (chineseSelect && savedSettings.chineseVoice) {
                chineseSelect.value = savedSettings.chineseVoice;
            }
            if (englishSelect && savedSettings.englishVoice) {
                englishSelect.value = savedSettings.englishVoice;
            }
            if (rateRange && savedSettings.speechRate) {
                rateRange.value = savedSettings.speechRate;
            }
            if (rateValue && savedSettings.speechRate) {
                rateValue.textContent = savedSettings.speechRate;
            }
            if (tplPickup) {
                tplPickup.value = savedSettings.broadcastTemplatePickup || broadcastTemplatePickup || CONFIG.DEFAULT_TEMPLATE_PICKUP;
            }
            if (tplArrived) {
                tplArrived.value = savedSettings.broadcastTemplateArrived || broadcastTemplateArrived || CONFIG.DEFAULT_TEMPLATE_ARRIVED;
            }
        };
    }
    
    if (closeModal) {
        closeModal.onclick = () => {
            if (settingsModal) settingsModal.style.display = 'none';
        };
    }
    
    window.onclick = (event) => {
        if (event.target === settingsModal) {
            if (settingsModal) settingsModal.style.display = 'none';
        }
    };
    
    // 語速控制
    const rateRange = document.getElementById('rateRange');
    const rateValue = document.getElementById('rateValue');
    
    if (rateRange && rateValue) {
        rateRange.oninput = () => {
            const rate = parseFloat(rateRange.value);
            setSpeechVars({ speechRate: rate });
            rateValue.textContent = rate;
        };
    }
    
    // 語音選擇事件處理
    const chineseSelect = document.getElementById('chineseVoiceSelect');
    const englishSelect = document.getElementById('englishVoiceSelect');
    
    if (chineseSelect) {
        chineseSelect.onchange = (e) => {
            const voice = voices.find(v => v.name === e.target.value);
            setSpeechVars({ chineseVoice: voice });
        };
    }
    
    if (englishSelect) {
        englishSelect.onchange = (e) => {
            const voice = voices.find(v => v.name === e.target.value);
            setSpeechVars({ englishVoice: voice });
        };
    }
    
    // 測試語音功能
    const playTest = document.getElementById('playTest');
    const pauseTest = document.getElementById('pauseTest');
    const testText = document.getElementById('testText');
    
    function refreshTestPreview() {
        const type = (document.querySelector('input[name="testType"]:checked')?.value) || 'pickup';
        const saved = JSON.parse(localStorage.getItem('voiceSettings') || '{}');
        const tplPickup = document.getElementById('broadcastTemplatePickup');
        const tplArrived = document.getElementById('broadcastTemplateArrived');
        const template = type === 'arrived'
            ? (tplArrived?.value || saved.broadcastTemplateArrived || broadcastTemplateArrived)
            : (tplPickup?.value || saved.broadcastTemplatePickup || broadcastTemplatePickup);
        const preview = template
            .replaceAll('{英文名}', 'Austin')
            .replaceAll('{中文名}', '王士軒');
        if (testText) testText.value = preview;
    }
    
    // 初始載入
    refreshTestPreview();
    
    // 變更測試類型時更新
    document.querySelectorAll('input[name="testType"]').forEach(r => {
        r.addEventListener('change', refreshTestPreview);
    });
    
    // 變更模板時更新
    const tplPickup = document.getElementById('broadcastTemplatePickup');
    const tplArrived = document.getElementById('broadcastTemplateArrived');
    if (tplPickup) tplPickup.addEventListener('input', refreshTestPreview);
    if (tplArrived) tplArrived.addEventListener('input', refreshTestPreview);
    
    // 覆寫測試播放，使用語言感知朗讀
    if (playTest) {
        playTest.onclick = () => {
            const vars = getSpeechVars();
            if (vars.speechSynth && vars.speechSynth.speaking) {
                vars.speechSynth.cancel();
            }
            refreshTestPreview();
            const text = testText?.value;
            if (text) {
                const segments = splitTextByLanguage(text);
                setSpeechVars({ isTestPlaying: true });
                if (playTest) playTest.disabled = true;
                if (pauseTest) pauseTest.disabled = false;
                speakSegments(segments);
            }
        };
    }
    
    if (pauseTest) {
        pauseTest.onclick = () => {
            const vars = getSpeechVars();
            setSpeechVars({ isTestPlaying: false });
            if (vars.speechSynth) vars.speechSynth.cancel();
            if (playTest) playTest.disabled = false;
            if (pauseTest) pauseTest.disabled = true;
        };
    }
    
    // 儲存設置
    if (saveSettingsBtn) {
        saveSettingsBtn.onclick = () => {
            const settings = saveSettings();
            broadcastTemplatePickup = settings.broadcastTemplatePickup || CONFIG.DEFAULT_TEMPLATE_PICKUP;
            broadcastTemplateArrived = settings.broadcastTemplateArrived || CONFIG.DEFAULT_TEMPLATE_ARRIVED;
            if (settingsModal) settingsModal.style.display = 'none';
            alert('設置已儲存');
        };
    }
    
    // Socket 初始化會在 auth.js 的 handleLineLogin 和 IP 白名單處理中進行
}

// 設置 Socket 事件監聽
function setupSocketEvents() {
    const socket = getSocket();
    if (!socket) return;
    
    // 監聽其他使用者的刪除事件
    socket.on('notification_deleted', (data) => {
        console.log('收到刪除通知:', data);
        removeCard(data.cardId);
    });
    
    // 監聽出發卡片更新事件（部分學生被接走）
    socket.on('pickup_card_updated', (data) => {
        console.log('收到出發卡片更新通知:', data);
        const cardId = `card-${data.timestamp.replace(/[^0-9]/g, '')}`;
        const card = document.getElementById(cardId);
        
        if (card) {
            // 更新卡片內容，顯示剩餘學生
            const messageText = card.querySelector('.message-text');
            if (messageText && data.remaining_students && data.remaining_students.length > 0) {
                const studentNames = data.remaining_students.join('、');
                messageText.textContent = studentNames;
                
                // 添加更新動畫效果
                card.style.backgroundColor = '#fffacd';
                setTimeout(() => {
                    card.style.backgroundColor = '';
                }, 1000);
            }
        }
    });
    
    // 監聽出發卡片移除事件（所有學生都被接走）
    socket.on('pickup_card_removed', (data) => {
        console.log('收到出發卡片移除通知:', data);
        const cardId = `card-${data.timestamp.replace(/[^0-9]/g, '')}`;
        removeCard(cardId);
    });
    
    // 接收通知時播放音效
    socket.on('pickup_notification', (data) => {
        console.log('收到接送通知:', data);
        createMessageCard_pickup(data);
        
        // 發送瀏覽器通知
        const studentNames = data.students.join('、');
        sendBrowserNotification('接送通知', {
            body: `${studentNames}`,
            tag: 'pickup-notification',
            renotify: true,
            requireInteraction: true
        });
        
        // 播放通知音效
        const notificationSound = document.getElementById('notificationSound');
        const audioEnabled = getAudioEnabled();
        playNotification(data.message, data.boradcast_student_names, 'pickup', notificationSound, audioEnabled);
    });
    
    socket.on('arrived_notification', (data) => {
        console.log('收到抵達通知:', data);
        createMessageCard_arrived(data);
        
        // 發送瀏覽器通知
        const studentNames = data.students.join('、');
        sendBrowserNotification('抵達通知', {
            body: `${studentNames}`,
            tag: 'arrived-notification',
            renotify: true,
            requireInteraction: true
        });
        
        // 播放通知音效
        const notificationSound = document.getElementById('notificationSound');
        const audioEnabled = getAudioEnabled();
        playNotification(data.message, data.boradcast_student_names, 'arrived', notificationSound, audioEnabled);
    });
    
    // 監聽廣播標記同步事件（其他裝置的標記狀態）
    socket.on('broadcast_marked_sync', (data) => {
        console.log('收到廣播標記同步:', data);
        updateCardBroadcastLevel(data.cardId, data.broadcastLevel);
    });
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    
    // 初始化 LIFF（在 auth.js 中定義）
    initializeLiff();
    
    // 測試音效播放
    const notificationSound = document.getElementById('notificationSound');
    if (notificationSound) {
        console.log('頁面載入完成，音效元素狀態:', {
            'audio元素是否存在': !!notificationSound,
            '音效來源': notificationSound.currentSrc,
            '準備狀態': notificationSound.readyState,
            '是否有錯誤': notificationSound.error
        });
    }
});

