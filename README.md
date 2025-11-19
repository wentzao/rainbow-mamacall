# 語音廣播系統 (Rainbow Mamacall)

一個基於 Socket.io 的即時語音廣播系統，用於接收和顯示接送通知（已出發/已抵達），支援 LINE 登入驗證、語音朗讀、瀏覽器通知等功能。

## 目錄

- [主要功能](#主要功能)
- [技術棧](#技術棧)
- [檔案結構](#檔案結構)
- [Socket.io 事件介面](#socketio-事件介面)
- [本地儲存](#本地儲存)
- [配置說明](#配置說明)
- [部署方式](#部署方式)
- [使用說明](#使用說明)

## 主要功能

### 1. 身份驗證
- **LINE 登入**：使用 LINE LIFF SDK 進行身份驗證
- **IP 白名單**：支援特定 IP 免登入直接使用
- **自動登入**：在 LIFF 環境中自動取得用戶資料

### 2. 即時通知接收
- **已出發通知** (`pickup_notification`)：顯示接送學生已出發的訊息
- **已抵達通知** (`arrived_notification`)：顯示家長已抵達的訊息
- **即時同步**：所有連線用戶即時同步通知狀態

### 3. 語音播放
- **桌面版**：使用 Web Speech API 進行語音朗讀
  - 支援中英文自動切換語音
  - 可自訂語音模板
  - 可調整語速（0.5x - 2x）
- **移動版**：播放音效提示（`ding.mp3`）

### 4. 自訂語音模板
- **已出發模板**：預設為 `{英文名} {中文名} 請準備`
- **已抵達模板**：預設為 `{英文名} {中文名} 家長已到達`
- **支援占位符**：
  - `{英文名}`：學生英文名
  - `{中文名}`：學生中文名
- **多位學生**：自動將所有學生姓名展開為單一語音訊息

### 5. UI 功能
- **字體大小調整**：4px - 48px，步進 4px
- **瀏覽器通知**：桌面通知提醒
- **訊息卡片管理**：可標記「已經接走囉」刪除通知
- **廣播標記功能**：點擊訊息卡片（除刪除按鈕外）可標記已透過麥克風廣播
  - **5 個階段**：每次點擊卡片，背景顏色會逐漸加深，並依亮度自動切換文字顏色
  - **同步功能**：所有連線裝置會即時同步廣播標記狀態
  - **視覺回饋**：從淺綠色（#f0fff9）逐步加深至祖母綠（#02a568），維持 5 個明顯層級
- **響應式設計**：支援桌面和移動設備
  - **桌面版（> 768px）**：兩欄並排顯示「已出發」和「已抵達」
  - **手機版（≤ 768px）**：
    - 頂端 Tab 導航列（Apple TV 風格），可點擊切換
    - 左右滑動切換頁面（觸摸滑動或點擊 Tab）
    - 滑動切換不依賴於是否有學生卡片，隨時可用
    - **未讀消息提示**：當使用者在某一欄位時，如果另一個欄位有新的信息，會在 Tab 右上角顯示紅色圓形數量徽章（最多顯示 99+），切換到該 Tab 時自動清除；若未讀卡片被其他裝置按下「接走囉」移除，徽章會即時重新統計，避免殘留錯誤數字

## 技術棧

- **前端框架**：純 HTML/CSS/JavaScript（無框架）
- **即時通訊**：Socket.io 4.7.2
- **身份驗證**：LINE LIFF SDK (edge/2)
- **語音合成**：Web Speech API (SpeechSynthesis)
- **本地儲存**：LocalStorage API
- **部署平台**：GitHub Pages

## 檔案結構

```
rainbow-mamacall-master/
├── index.html              # 主頁面（入口點）
├── css/
│   └── styles.css          # 樣式表
├── js/
│   ├── config.js           # 配置檔案
│   ├── auth.js             # LINE 登入相關
│   ├── socket.js           # Socket.io 連接與事件處理
│   ├── speech.js           # 語音合成相關
│   ├── ui.js               # UI 控制與互動
│   └── main.js             # 主初始化檔案
├── ding.mp3                # 通知音效
├── notification-icon-192x192.png  # 通知圖示（192x192）
├── notification-icon-72x72.png    # 通知圖示（72x72）
├── CNAME                   # GitHub Pages 自訂網域
└── README.md               # 本文件
```

## Socket.io 事件介面

### 客戶端發送事件

#### `delete_notification`
刪除通知卡片
```javascript
socket.emit('delete_notification', {
    cardId: 'card-1234567890',
    timestamp: '2024-01-01 12:00:00'
});
```

#### `ping`
心跳包檢查連接狀態（每 30 秒自動發送）
```javascript
socket.emit('ping');
```

#### `broadcast_marked`
標記訊息卡片已透過麥克風廣播
```javascript
socket.emit('broadcast_marked', {
    cardId: 'card-1234567890',
    timestamp: '2024-01-01 12:00:00',
    broadcastLevel: 3  // 廣播等級（1-5）
});
```

**事件說明**：
- 當使用者點擊訊息卡片（除 `.delete-btn` 外）時，前端會自動發送此事件
- `broadcastLevel` 會從 1 開始，每次點擊遞增，最多到 5
- 伺服器收到此事件後，應該廣播給所有連線的客戶端（除了發送者）

### 伺服器發送事件

#### `pickup_notification`
接收已出發通知
```javascript
socket.on('pickup_notification', (data) => {
    // data 結構：
    // {
    //     timestamp: '2024-01-01 12:00:00',
    //     display_name: '顯示名稱',
    //     students: ['學生1', '學生2'],
    //     boradcast_student_names: [['英文名1', '中文名1'], ['英文名2', '中文名2']],
    //     message: '訊息內容'
    // }
});
```

#### `arrived_notification`
接收已抵達通知
```javascript
socket.on('arrived_notification', (data) => {
    // data 結構與 pickup_notification 相同
});
```

#### `notification_deleted`
其他用戶刪除通知的同步事件
```javascript
socket.on('notification_deleted', (data) => {
    // data: { cardId: 'card-1234567890' }
});
```

#### `pickup_card_updated`
已出發卡片更新（部分學生被接走）
```javascript
socket.on('pickup_card_updated', (data) => {
    // data 結構：
    // {
    //     timestamp: '2024-01-01 12:00:00',
    //     remaining_students: ['剩餘學生1', '剩餘學生2']
    // }
});
```

#### `pickup_card_removed`
已出發卡片移除（所有學生都被接走）
```javascript
socket.on('pickup_card_removed', (data) => {
    // data: { timestamp: '2024-01-01 12:00:00' }
});
```

#### `pong`
伺服器回應心跳包
```javascript
socket.on('pong', () => {
    console.log('伺服器回應心跳包');
});
```

#### `delete_error`
刪除操作失敗
```javascript
socket.on('delete_error', (error) => {
    // error: 錯誤訊息
});
```

#### `broadcast_marked_sync`
接收其他裝置的廣播標記同步
```javascript
socket.on('broadcast_marked_sync', (data) => {
    // data 結構：
    // {
    //     cardId: 'card-1234567890',
    //     broadcastLevel: 3  // 廣播等級（1-5）
    // }
});
```

**事件說明**：
- 當其他裝置標記廣播時，伺服器會廣播此事件給所有連線的客戶端（除了發送者）
- 前端收到此事件後，會自動更新對應卡片的 `data-broadcast-level` 屬性
- 卡片會根據 `broadcastLevel` 自動套用對應的 CSS 樣式（背景和字體顏色）

#### `disconnect`
與伺服器斷開連接
```javascript
socket.on('disconnect', (reason) => {
    // reason: 斷線原因
    // 'io server disconnect': 伺服器主動斷開
    // 其他情況會自動嘗試重連
});
```

## 本地儲存

### `voiceSettings` (JSON)
語音設置
```javascript
{
    chineseVoice: "語音名稱",        // 中文語音名稱
    englishVoice: "語音名稱",        // 英文語音名稱
    speechRate: 1,                   // 語速（0.5 - 2）
    broadcastTemplatePickup: "{英文名} {中文名} 請準備",
    broadcastTemplateArrived: "{英文名} {中文名} 家長已到達"
}
```

### `cardFontSize` (Number)
卡片字體大小（px），預設 16，範圍 4-48

## 配置說明

### Socket.io 伺服器
- **伺服器位址**：`https://rainbowstudent.wentzao.com`
- **路徑**：`/socket.io/`
- **傳輸方式**：WebSocket（優先），失敗時降級為 Polling
- **重連設定**：
  - 最大重連次數：10
  - 重連延遲：1000ms
  - 最大重連延遲：5000ms

### LINE LIFF
- **LIFF ID**：`1655533540-PgQ1MEgK`
- **SDK 版本**：edge/2

### IP 白名單
以下 IP 可免登入直接使用（使用預設頭像）：
- `114.33.21.210`
- `220.133.28.115`

### 語音設定
- **語速範圍**：0.5x - 2x（預設 1x）
- **語音選擇**：依系統可用語音自動載入
- **語言偵測**：自動依字元語系切換中英文語音

## 部署方式

### GitHub Pages 部署

1. **準備檔案**
   - 確保所有檔案都在專案根目錄或適當的子目錄
   - `index.html` 必須在根目錄作為入口點

2. **設定 GitHub Pages**
   - 進入 GitHub 專案設定
   - 選擇 Settings > Pages
   - Source 選擇 `main` (或 `master`) 分支
   - 選擇 `/ (root)` 資料夾
   - 儲存設定

3. **自訂網域（選用）**
   - 在專案根目錄建立 `CNAME` 檔案
   - 內容為自訂網域名稱（例如：`rainbowmamacall.wentzao.com`）
   - 在 DNS 設定中添加 CNAME 記錄指向 `username.github.io`

4. **驗證部署**
   - 等待幾分鐘後訪問 `https://username.github.io/repository-name`
   - 或訪問自訂網域

### 本地測試

```bash
# 使用 Python 簡單伺服器
python -m http.server 8000

# 或使用 Node.js http-server
npx http-server -p 8000
```

訪問 `http://localhost:8000`

## 使用說明

### 首次使用

1. **開啟頁面**：訪問部署的網址
2. **登入驗證**：
   - 在 LINE 內開啟：自動登入
   - 外部瀏覽器：點擊「使用 LINE 登入」
   - 特定 IP：自動跳過登入
3. **啟用音效**：點擊「點我開啟聲音通知」按鈕
4. **設定語音**（桌面版）：
   - 點擊右上角頭像 > 設置
   - 選擇中英文語音
   - 調整語速
   - 自訂語音模板
   - 測試語音效果
   - 儲存設置

### 日常使用

- **接收通知**：系統自動接收並顯示通知卡片
- **語音播放**：桌面版自動朗讀，移動版播放音效
- **管理通知**：點擊「已經接走囉」按鈕刪除通知
- **調整字體**：使用導航欄的 +/- 按鈕調整字體大小

### 語音模板範例

**已出發模板**：
```
{英文名} {中文名} 請準備
```

**已抵達模板**：
```
{英文名} {中文名} 家長已到達
```

**多位學生**：系統會自動將所有學生姓名展開，例如：
```
Austin 王士軒 Kevin 陳凱文 請準備
```

## 瀏覽器相容性

- **Chrome/Edge**：完整支援（推薦）
- **Safari**：支援（iOS Safari 語音選項較少）
- **Firefox**：支援
- **移動瀏覽器**：支援音效播放，語音朗讀功能受限

## 注意事項

1. **音效播放**：首次使用需用戶互動才能播放音效（瀏覽器安全限制）
2. **通知權限**：首次使用會請求瀏覽器通知權限
3. **語音 API**：移動設備的語音合成功能可能受限
4. **網路連線**：需要穩定的網路連線以維持 Socket.io 連接

## 疑難排解

### 無法連接伺服器
- 檢查網路連線
- 確認伺服器位址是否正確
- 查看瀏覽器控制台錯誤訊息

### 語音無法播放
- 確認已選擇語音（桌面版）
- 檢查瀏覽器是否支援 Web Speech API
- 嘗試重新載入頁面

### LINE 登入失敗
- 確認 LIFF ID 是否正確
- 檢查是否在允許的網域中
- 嘗試清除瀏覽器快取

---

## 後端實作說明

### 廣播標記功能後端處理

當前端發送 `broadcast_marked` 事件時，後端需要進行以下處理：

#### 1. 接收事件
```javascript
socket.on('broadcast_marked', (data) => {
    // data 結構：
    // {
    //     cardId: 'card-1234567890',
    //     timestamp: '2024-01-01 12:00:00',
    //     broadcastLevel: 3
    // }
});
```

#### 2. 廣播給其他客戶端
後端應該將此事件廣播給所有連線的客戶端（**除了發送者**），使用 `broadcast_marked_sync` 事件：

```javascript
socket.on('broadcast_marked', (data) => {
    // 廣播給所有其他客戶端（不包括發送者）
    socket.broadcast.emit('broadcast_marked_sync', {
        cardId: data.cardId,
        broadcastLevel: data.broadcastLevel
    });
});
```

#### 3. 可選：持久化儲存
如果需要持久化廣播標記狀態（例如：重新連線後恢復狀態），可以將 `cardId` 和 `broadcastLevel` 儲存到資料庫中。

#### 4. 可選：狀態恢復
當新客戶端連線時，如果需要恢復所有卡片的廣播標記狀態，可以在連線時發送所有卡片的狀態：

```javascript
socket.on('connect', () => {
    // 假設你有一個儲存所有卡片狀態的物件
    const allCardStates = getAllCardBroadcastStates();
    
    // 發送給新連線的客戶端
    socket.emit('restore_broadcast_states', allCardStates);
});
```

**注意事項**：
- `broadcastLevel` 範圍為 1-5，前端會自動限制
- `cardId` 格式為 `card-{timestamp數字}`，例如：`card-1234567890`
- 建議驗證 `broadcastLevel` 是否在有效範圍內（1-5）

---

**最後更新**：2025-11-19 18:05

## 手機版滑動切換功能

### 功能說明
在手機螢幕大小（≤ 768px）時，系統會自動切換為滑動切換模式：

1. **Tab 導航列**：頂端顯示「已出發」和「已抵達」兩個 Tab，採用 Apple TV 風格的滑順動畫指示器
2. **點擊切換**：點擊 Tab 即可切換到對應頁面
3. **滑動切換**：支援左右滑動手勢切換頁面
   - 向左滑動：從「已出發」切換到「已抵達」
   - 向右滑動：從「已抵達」切換到「已出發」
4. **滑動靈敏度**：最小滑動距離 50px 觸發切換
5. **垂直滾動保護**：滑動切換會智能判斷水平/垂直滑動，不影響訊息列表的垂直滾動

### 技術實作
- 使用 CSS `transform: translateX()` 實現平滑過渡動畫
- 使用 `cubic-bezier(0.4, 0, 0.2, 1)` 緩動函數實現 Apple TV 風格的流暢動畫
- 觸摸事件處理支援被動監聽以優化性能
- 大螢幕（> 768px）自動恢復為兩欄並排顯示

## 程式碼結構說明

### 模組化設計
專案採用模組化設計，將原本單一 HTML 檔案中的程式碼拆分為多個獨立模組：

- **config.js**：集中管理所有配置（伺服器位址、LIFF ID、IP 白名單等）
- **auth.js**：處理 LINE 登入驗證邏輯
- **speech.js**：語音合成相關功能（語音選擇、模板處理、佇列管理）
- **socket.js**：Socket.io 連接管理與基本事件處理
- **ui.js**：UI 控制功能（訊息卡片、字體大小、音效等）
- **main.js**：主初始化檔案，整合所有模組並設置事件監聽

### 載入順序
JavaScript 模組必須按照以下順序載入：
1. `config.js` - 配置檔案（其他模組依賴）
2. `auth.js` - 登入模組
3. `speech.js` - 語音模組
4. `socket.js` - Socket 模組
5. `ui.js` - UI 模組
6. `main.js` - 主初始化（最後載入）

### GitHub Pages 相容性
- 所有檔案路徑使用相對路徑（`./css/`, `./js/`）
- `index.html` 位於根目錄，符合 GitHub Pages 規範
- 無需建置步驟，可直接部署

