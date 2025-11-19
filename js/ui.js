// UI 控制與互動功能
let currentFontSize = parseInt(localStorage.getItem('cardFontSize')) || CONFIG.FONT_SIZE.DEFAULT;
let audioEnabled = false;
const MAX_BROADCAST_LEVEL = 5;

// 更新時鐘
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const clockElement = document.getElementById('clock');
    if (clockElement) {
        clockElement.textContent = `${hours}:${minutes}`;
    }
}

// 初始化時鐘
function initializeClock() {
    updateClock();
    setInterval(updateClock, 60000);
}

// 創建訊息卡片（已出發）
function createMessageCard_pickup(data) {
    const card = document.createElement('div');
    // 添加唯一ID，用於刪除時識別
    const cardId = `card-${data.timestamp.replace(/[^0-9]/g, '')}`;
    card.id = cardId;
    card.className = 'message-card';
    card.setAttribute('data-tab', 'pickup');
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = data.timestamp;
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    
    // 顯示訊息和學生名單
    if (data.boradcast_student_names.length < 1) {
        messageText.textContent = `${data.display_name}`;
    } else {
        const studentNames = data.students.join('、');
        messageText.textContent = `${studentNames}`;
    }
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '接走囉';
    deleteBtn.onclick = () => {
        // 發送刪除事件到服務器
        const socket = getSocket();
        if (socket) {
            socket.emit('delete_notification', { 
                cardId: cardId,
                timestamp: data.timestamp 
            });
        }
        // 本地刪除卡片
        removeCard(cardId);
    };
    
    content.appendChild(time);
    content.appendChild(messageText);
    card.appendChild(content);
    card.appendChild(deleteBtn);
    
    // 將新卡片插入到「已出發」列表的最前面
    const messageList = document.getElementById('pickupList');
    if (messageList) {
        messageList.insertBefore(card, messageList.firstChild);
    }
    
    // 增加未讀計數（如果不在 pickup tab）
    incrementUnreadCount('pickup', card);
    
    // 添加卡片點擊事件（廣播標記功能）
    setupCardBroadcastMarking(card, cardId, data.timestamp);
    
    return card;
}

// 創建訊息卡片（已抵達）
function createMessageCard_arrived(data) {
    const card = document.createElement('div');
    // 添加唯一ID，用於刪除時識別
    const cardId = `card-${data.timestamp.replace(/[^0-9]/g, '')}`;
    card.id = cardId;
    card.className = 'message-card';
    card.setAttribute('data-tab', 'arrived');
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = data.timestamp;
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    
    // 顯示訊息和學生名單
    if (data.boradcast_student_names.length < 1) {
        messageText.textContent = `${data.display_name}`;
    } else {
        const studentNames = data.students.join('、');
        messageText.textContent = `${studentNames}`;
    }
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '接走囉';
    deleteBtn.onclick = () => {
        // 發送刪除事件到服務器
        const socket = getSocket();
        if (socket) {
            socket.emit('delete_notification', { 
                cardId: cardId,
                timestamp: data.timestamp 
            });
        }
        // 本地刪除卡片
        removeCard(cardId);
    };
    
    content.appendChild(time);
    content.appendChild(messageText);
    card.appendChild(content);
    card.appendChild(deleteBtn);
    
    // 將新卡片插入到「已抵達」列表的最前面
    const messageList = document.getElementById('arrivedList');
    if (messageList) {
        messageList.insertBefore(card, messageList.firstChild);
    }
    
    // 增加未讀計數（如果不在 arrived tab）
    incrementUnreadCount('arrived', card);
    
    // 添加卡片點擊事件（廣播標記功能）
    setupCardBroadcastMarking(card, cardId, data.timestamp);
    
    return card;
}

// 刪除卡片的函數
function removeCard(cardId) {
    const card = document.getElementById(cardId);
    if (card) {
        handleUnreadOnRemoval(card);
        // 添加移除中的類別來觸發過渡效果
        card.classList.add('removing');
        // 等待過渡效果完成後移除元素
        setTimeout(() => {
            card.remove();
        }, 200); // 配合 CSS transition 時間
    }
}

// 字體大小控制
function updateFontSize(size) {
    currentFontSize = Math.max(CONFIG.FONT_SIZE.MIN, Math.min(CONFIG.FONT_SIZE.MAX, size));
    document.documentElement.style.setProperty('--card-font-size', `${currentFontSize}px`);
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    if (fontSizeDisplay) {
        fontSizeDisplay.textContent = `${currentFontSize}px`;
    }
    localStorage.setItem('cardFontSize', currentFontSize);
}

// 初始化字體大小
function initializeFontSize() {
    updateFontSize(currentFontSize);
    
    // 綁定按鈕事件
    const increaseBtn = document.getElementById('increaseFontBtn');
    const decreaseBtn = document.getElementById('decreaseFontBtn');
    
    if (increaseBtn) {
        increaseBtn.addEventListener('click', () => {
            updateFontSize(currentFontSize + CONFIG.FONT_SIZE.STEP);
        });
    }
    
    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', () => {
            updateFontSize(currentFontSize - CONFIG.FONT_SIZE.STEP);
        });
    }
}

// 初始化音效播放
function initializeAudio() {
    const notificationSound = document.getElementById('notificationSound');
    const overlay = document.getElementById('overlay');
    const connectButton = document.getElementById('connectButton');
    
    if (!notificationSound || !overlay || !connectButton) return;
    
    // 點擊連接按鈕
    connectButton.addEventListener('click', async () => {
        try {
            // 嘗試播放音效（這會觸發用戶互動）
            await notificationSound.play();
            notificationSound.pause();
            notificationSound.currentTime = 0;
            audioEnabled = true;
            console.log('音效播放已啟用');
            
            // 移除覆蓋層
            overlay.style.animation = 'fadeOut 0.3s';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        } catch (error) {
            console.error('無法啟用音效播放:', error);
            alert('無法啟用音效播放，請確保允許網站播放音效');
        }
    });

    // 音效載入檢查
    notificationSound.addEventListener('loadeddata', () => {
        console.log('音效檔案已成功載入');
    });

    notificationSound.addEventListener('error', (e) => {
        console.error('音效載入失敗:', e);
    });
    
    return { notificationSound, audioEnabled: () => audioEnabled };
}

// 初始化用戶介面控制
function initializeUIControls() {
    // 頭像下拉選單控制
    const profileImage = document.getElementById('profileImage');
    const dropdownMenu = document.getElementById('dropdownMenu');
    
    if (profileImage && dropdownMenu) {
        profileImage.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
    }

    // 點擊其他地方關閉下拉選單
    document.addEventListener('click', () => {
        if (dropdownMenu) {
            dropdownMenu.classList.remove('show');
        }
    });

    // 登出功能
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
}

// 模板按鈕插入文字
function insertAtCursor(textarea, token) {
    const el = textarea;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const pre = el.value.substring(0, start);
    const post = el.value.substring(end);
    el.value = pre + token + post;
    const pos = start + token.length;
    el.selectionStart = el.selectionEnd = pos;
    el.focus();
}

// 初始化模板按鈕
function initializeTemplateButtons() {
    const insertZhBtnPickup = document.getElementById('insertZhNamePickup');
    const insertEnBtnPickup = document.getElementById('insertEnNamePickup');
    const insertZhBtnArrived = document.getElementById('insertZhNameArrived');
    const insertEnBtnArrived = document.getElementById('insertEnNameArrived');
    const tplTextareaPickup = document.getElementById('broadcastTemplatePickup');
    const tplTextareaArrived = document.getElementById('broadcastTemplateArrived');
    
    if (insertZhBtnPickup && tplTextareaPickup) {
        insertZhBtnPickup.onclick = () => insertAtCursor(tplTextareaPickup, '{中文名}');
    }
    if (insertEnBtnPickup && tplTextareaPickup) {
        insertEnBtnPickup.onclick = () => insertAtCursor(tplTextareaPickup, '{英文名}');
    }
    if (insertZhBtnArrived && tplTextareaArrived) {
        insertZhBtnArrived.onclick = () => insertAtCursor(tplTextareaArrived, '{中文名}');
    }
    if (insertEnBtnArrived && tplTextareaArrived) {
        insertEnBtnArrived.onclick = () => insertAtCursor(tplTextareaArrived, '{英文名}');
    }
}

// 取得音效啟用狀態
function getAudioEnabled() {
    return audioEnabled;
}

// 未讀消息計數追蹤（手機版）
let unreadCounts = {
    pickup: 0,
    arrived: 0
};
let currentTab = 'pickup'; // 全局變數，用於追蹤當前 tab

// 更新 Tab 徽章顯示
function updateTabBadge(tab, count) {
    const mobileTabNav = document.getElementById('mobileTabNav');
    if (!mobileTabNav) return;
    
    const tabItem = mobileTabNav.querySelector(`.tab-item[data-tab="${tab}"]`);
    if (!tabItem) return;
    
    // 移除現有的徽章
    const existingBadge = tabItem.querySelector('.tab-badge');
    if (existingBadge) {
        existingBadge.remove();
    }
    
    // 如果有未讀消息，添加徽章
    if (count > 0) {
        const badge = document.createElement('span');
        badge.className = 'tab-badge';
        badge.textContent = count > 99 ? '99+' : count.toString();
        tabItem.appendChild(badge);
    }
}

// 增加未讀計數（當收到新消息且不在該 tab 時）
function incrementUnreadCount(tab, card) {
    // 只在手機版顯示時才追蹤
    if (window.innerWidth > 768) return;
    
    // 如果當前不在該 tab，則增加未讀計數
    if (currentTab !== tab) {
        unreadCounts[tab]++;
        updateTabBadge(tab, unreadCounts[tab]);
        if (card) {
            card.setAttribute('data-unread', 'true');
        }
    } else if (card) {
        card.removeAttribute('data-unread');
    }
}

// 清除未讀計數（當切換到該 tab 時）
function clearUnreadCount(tab) {
    unreadCounts[tab] = 0;
    updateTabBadge(tab, 0);
    
    const listId = tab === 'arrived' ? 'arrivedList' : 'pickupList';
    const list = document.getElementById(listId);
    if (list) {
        list.querySelectorAll('.message-card[data-unread="true"]').forEach((card) => {
            card.removeAttribute('data-unread');
        });
    }
}

// 卡片被移除時自動調整未讀徽章
function handleUnreadOnRemoval(card) {
    if (!card) return;
    
    const tab = card.getAttribute('data-tab');
    if (!tab) {
        card.removeAttribute('data-unread');
        return;
    }
    
    if (window.innerWidth <= 768 && card.getAttribute('data-unread') === 'true') {
        unreadCounts[tab] = Math.max(unreadCounts[tab] - 1, 0);
        updateTabBadge(tab, unreadCounts[tab]);
    }
    
    card.removeAttribute('data-unread');
}

// 手機版滑動切換功能
function initializeMobileSwipe() {
    const messageColumns = document.getElementById('messageColumns');
    const mobileTabNav = document.getElementById('mobileTabNav');
    const tabItems = mobileTabNav ? mobileTabNav.querySelectorAll('.tab-item') : [];
    const tabIndicator = mobileTabNav ? mobileTabNav.querySelector('.tab-indicator') : null;
    const pickupColumn = document.getElementById('pickupColumn');
    const arrivedColumn = document.getElementById('arrivedColumn');
    
    if (!messageColumns || !mobileTabNav || !pickupColumn || !arrivedColumn) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    let isDragging = false;
    let currentTranslateX = 0;
    const screenWidth = window.innerWidth;
    
    // Tab 點擊切換
    tabItems.forEach((item) => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            switchTab(tab);
        });
    });
    
    // 切換 Tab 函數
    function switchTab(tab) {
        if (currentTab === tab) return;
        
        // 清除切換到的 tab 的未讀計數
        clearUnreadCount(tab);
        
        currentTab = tab;
        
        // 更新 Tab 樣式
        tabItems.forEach((item) => {
            if (item.getAttribute('data-tab') === tab) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // 更新指示器位置
        if (tabIndicator) {
            if (tab === 'arrived') {
                tabIndicator.classList.add('active-arrived');
            } else {
                tabIndicator.classList.remove('active-arrived');
            }
        }
        
        // 切換內容區域
        if (tab === 'arrived') {
            messageColumns.classList.add('slide-to-arrived');
        } else {
            messageColumns.classList.remove('slide-to-arrived');
        }
    }
    
    // 觸摸事件處理
    messageColumns.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isDragging = true;
        
        // 禁用過渡效果，實現即時跟隨
        pickupColumn.style.transition = 'none';
        arrivedColumn.style.transition = 'none';
        
        // 確保 arrivedColumn 可見以便滑動
        arrivedColumn.style.visibility = 'visible';
        arrivedColumn.style.opacity = '1';
        arrivedColumn.style.zIndex = '1';
    }, { passive: true });
    
    messageColumns.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        const touchCurrentX = e.touches[0].clientX;
        const touchCurrentY = e.touches[0].clientY;
        const deltaX = touchCurrentX - touchStartX;
        const deltaY = Math.abs(touchCurrentY - touchStartY);
        
        // 如果主要是垂直滾動，則不處理水平滑動
        if (deltaY > Math.abs(deltaX)) return;
        
        // 阻止瀏覽器預設的水平滑動（如上一頁/下一頁）
        if (Math.abs(deltaX) > 10) {
            e.preventDefault();
        }
        
        // 使用 requestAnimationFrame 優化效能
        requestAnimationFrame(() => {
            // 再次檢查是否仍在拖曳中，避免 race condition
            if (!isDragging) return;

            const currentScreenWidth = window.innerWidth;
            
            // 計算移動距離，加入彈性阻尼效果
            if (currentTab === 'pickup') {
                if (deltaX > 0) {
                    // 向右滑（超出邊界），加入阻尼
                    currentTranslateX = deltaX * 0.4;
                } else {
                    // 向左滑（正常滑動）
                    currentTranslateX = Math.max(deltaX, -currentScreenWidth);
                }
                
                pickupColumn.style.transform = `translateX(${currentTranslateX}px)`;
                arrivedColumn.style.transform = `translateX(${currentScreenWidth + currentTranslateX}px)`;
                
            } else { // currentTab === 'arrived'
                if (deltaX < 0) {
                    // 向左滑（超出邊界），加入阻尼
                    currentTranslateX = deltaX * 0.4;
                } else {
                    // 向右滑（正常滑動）
                    currentTranslateX = Math.min(deltaX, currentScreenWidth);
                }
                
                arrivedColumn.style.transform = `translateX(${currentTranslateX}px)`;
                pickupColumn.style.transform = `translateX(${currentTranslateX - currentScreenWidth}px)`;
            }
        });
        
    }, { passive: false });
    
    const handleTouchEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        // 恢復過渡效果
        pickupColumn.style.transition = '';
        arrivedColumn.style.transition = '';
        
        // 清除 inline styles
        pickupColumn.style.transform = '';
        arrivedColumn.style.transform = '';
        arrivedColumn.style.visibility = '';
        arrivedColumn.style.opacity = '';
        arrivedColumn.style.zIndex = '';
        
        const touchEndX = e.changedTouches ? e.changedTouches[0].clientX : e.touches[0].clientX; // 兼容 touchcancel
        const diff = touchEndX - touchStartX;
        const currentScreenWidth = window.innerWidth;
        const threshold = currentScreenWidth * 0.3; // 滑動超過 30% 則切換
        
        if (currentTab === 'pickup') {
            if (diff < -threshold) {
                switchTab('arrived');
            } else {
                // 回彈效果由 CSS transition 處理
            }
        } else { // currentTab === 'arrived'
            if (diff > threshold) {
                switchTab('pickup');
            } else {
                // 回彈效果
            }
        }
    };

    messageColumns.addEventListener('touchend', handleTouchEnd, { passive: true });
    messageColumns.addEventListener('touchcancel', handleTouchEnd, { passive: true });
}

// 設置卡片廣播標記功能
function setupCardBroadcastMarking(card, cardId, timestamp) {
    // 初始化廣播等級為 0（未標記）
    if (!card.hasAttribute('data-broadcast-level')) {
        card.setAttribute('data-broadcast-level', '0');
    }
    
    // 添加點擊事件監聽器（排除 .delete-btn）
    card.addEventListener('click', (e) => {
        // 如果點擊的是刪除按鈕，不處理
        if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
            return;
        }
        
        // 獲取當前廣播等級
        let currentLevel = parseInt(card.getAttribute('data-broadcast-level')) || 0;
        
        // 增加等級（最多 5 級）
        currentLevel = Math.min(currentLevel + 1, MAX_BROADCAST_LEVEL);
        card.setAttribute('data-broadcast-level', currentLevel.toString());
        
        // 發送 Socket.io 事件到伺服器
        const socket = getSocket();
        if (socket) {
            socket.emit('broadcast_marked', {
                cardId: cardId,
                timestamp: timestamp,
                broadcastLevel: currentLevel
            });
        }
    });
}

// 更新卡片廣播標記等級（用於同步其他裝置的狀態）
function updateCardBroadcastLevel(cardId, broadcastLevel) {
    const card = document.getElementById(cardId);
    if (card) {
        const clampedLevel = Math.min(
            Math.max(parseInt(broadcastLevel, 10) || 0, 0),
            MAX_BROADCAST_LEVEL
        );
        card.setAttribute('data-broadcast-level', clampedLevel.toString());
    }
}

