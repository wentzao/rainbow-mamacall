// 語音合成相關功能
let speechSynth = null;
let voices = [];
let chineseVoice = null;
let englishVoice = null;
let speechRate = CONFIG.SPEECH_RATE.DEFAULT;
let isTestPlaying = false;

// 全域語音播放佇列（桌面）
const speechQueue = [];
let isProcessingQueue = false;

// 檢測系統和瀏覽器
function detectSystem() {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    let system = {
        os: 'unknown',
        browser: 'unknown',
        isMobile: /iPhone|iPad|iPod|Android/.test(userAgent)
    };

    if (/iPhone|iPad|iPod/.test(userAgent)) {
        system.os = 'iOS';
    } else if (/Android/.test(userAgent)) {
        system.os = 'Android';
    } else if (/Win/.test(platform)) {
        system.os = 'Windows';
    } else if (/Mac/.test(platform)) {
        system.os = 'MacOS';
    }

    if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
        system.browser = 'Safari';
    } else if (/Chrome/.test(userAgent)) {
        system.browser = 'Chrome';
    } else if (/Firefox/.test(userAgent)) {
        system.browser = 'Firefox';
    }

    console.log('檢測到的系統：', system.os);
    console.log('檢測到的瀏覽器：', system.browser);
    return system;
}

const system = detectSystem();

// 初始化語音合成
function initializeSpeech() {
    if (!system.isMobile) {
        speechSynth = window.speechSynthesis;
        
        // 載入可用的語音
        function loadVoices() {
            voices = speechSynth.getVoices();
            const voiceSelect = document.getElementById('voiceSelect');
            if (voiceSelect) {
                voiceSelect.innerHTML = '';

                if (system.os === 'iOS' && system.browser === 'Safari') {
                    const desiredVoices = {
                        '美佳 (zh-TW)': 'zh-TW',
                        'Karen (en-AU)': 'en-AU',
                        'Samantha (en-US)': 'en-US',
                        'Daniel (en-GB)': 'en-GB'
                    };

                    const addedVoices = new Set();

                    voices.forEach((voice, index) => {
                        for (let desiredVoice in desiredVoices) {
                            if (voice.name.includes(desiredVoice.split(' ')[0]) && 
                                voice.lang === desiredVoices[desiredVoice] &&
                                !addedVoices.has(desiredVoice)) {
                                const option = document.createElement('option');
                                option.value = index;
                                option.textContent = desiredVoice;
                                voiceSelect.appendChild(option);
                                addedVoices.add(desiredVoice);
                            }
                        }
                    });
                } else {
                    voices.forEach((voice, index) => {
                        const option = document.createElement('option');
                        option.value = index;
                        option.textContent = `${voice.name} (${voice.lang})`;
                        voiceSelect.appendChild(option);
                    });
                }
            }
            
            // 更新設置中的語音選單
            if (typeof updateVoiceSelects === 'function') {
                updateVoiceSelects();
            }
        }

        // 確保在不同瀏覽器都能正確載入語音
        speechSynth.onvoiceschanged = loadVoices;
        loadVoices();
    } else {
        // 在移動設備上隱藏語音選擇控制項
        const controls = document.querySelector('.controls');
        if (controls) {
            controls.style.display = 'none';
        }
    }
}

// 判斷是否為中文字元
function isChineseChar(char) {
    return /[\u4e00-\u9fa5]/.test(char);
}

// 依語言分割文字
function splitTextByLanguage(text) {
    let segments = [];
    let currentSegment = '';
    let currentType = null;

    for (let char of text) {
        let isCurrentChinese = isChineseChar(char);
        
        if (currentType === null) {
            currentType = isCurrentChinese;
            currentSegment = char;
        } else if (currentType === isCurrentChinese) {
            currentSegment += char;
        } else {
            if (currentSegment.trim()) {
                segments.push({
                    text: currentSegment.trim(),
                    isChinese: currentType
                });
            }
            currentType = isCurrentChinese;
            currentSegment = char;
        }
    }

    if (currentSegment.trim()) {
        segments.push({
            text: currentSegment.trim(),
            isChinese: currentType
        });
    }

    return segments;
}

// 依模板填入多位學生姓名
function buildNamesText(boradcast_student_names) {
    if (!Array.isArray(boradcast_student_names) || boradcast_student_names.length === 0) return '';
    // 每個元素為 [engName, zhName]
    const parts = [];
    for (const pair of boradcast_student_names) {
        const eng = pair?.[0] || '';
        const zh = pair?.[1] || '';
        // 名稱之間以空白分隔，語音會自然停頓
        parts.push(eng, zh);
    }
    return parts.filter(Boolean).join(' ');
}

function fillTemplateForMultiple(template, boradcast_student_names) {
    if (!template) return '';
    if (!Array.isArray(boradcast_student_names) || boradcast_student_names.length === 0) {
        // 沒有名單直接清空 token
        return template.replaceAll('{英文名}', '').replaceAll('{中文名}', '').replace(/\s+/g, ' ').trim();
    }
    // 規則：將所有孩子的英文名與中文名串接放前面，保留模板中的其他文字
    const namesJoined = buildNamesText(boradcast_student_names);
    // 移除模板中的 token 並壓縮空白
    const templateWithoutTokens = template.replaceAll('{英文名}', '').replaceAll('{中文名}', '').replace(/\s+/g, ' ').trim();
    return (namesJoined + ' ' + templateWithoutTokens).replace(/\s+/g, ' ').trim();
}

// 以語言分段的序列播放（用於佇列項目）
function speakSegmentsSequential(segments, index, onComplete) {
    if (!speechSynth) { if (onComplete) onComplete(); return; }
    if (index >= segments.length) { if (onComplete) onComplete(); return; }

    const segment = segments[index];
    const utterance = new SpeechSynthesisUtterance(segment.text);
    utterance.voice = segment.isChinese
        ? (chineseVoice || voices.find(v => v.lang && v.lang.startsWith('zh')))
        : (englishVoice || voices.find(v => v.lang && v.lang.startsWith('en')));
    utterance.rate = speechRate;

    utterance.onend = () => {
        speakSegmentsSequential(segments, index + 1, onComplete);
    };
    utterance.onerror = () => {
        speakSegmentsSequential(segments, index + 1, onComplete);
    };

    speechSynth.speak(utterance);
}

// 處理語音佇列
function processSpeechQueue() {
    if (!speechSynth) return;
    if (isProcessingQueue) return;
    if (speechQueue.length === 0) return;
    isProcessingQueue = true;

    const nextText = speechQueue.shift();
    const segments = splitTextByLanguage(nextText);
    speakSegmentsSequential(segments, 0, () => {
        isProcessingQueue = false;
        // 完成一筆後立刻處理下一筆（若有）
        processSpeechQueue();
    });
}

// 加入語音佇列
function enqueueSpeech(text) {
    if (!text) return;
    speechQueue.push(text);
    processSpeechQueue();
}

// 播放通知音效或朗讀文字
async function playNotification(text, boradcast_student_names, type, notificationSound, audioEnabled) {
    if (system.isMobile) {
        // 移動設備只播放提示音
        if (audioEnabled && notificationSound) {
            try {
                notificationSound.currentTime = 0;
                await notificationSound.play();
                console.log('通知音效播放成功');
            } catch (error) {
                console.error('播放音效時發生錯誤:', error);
            }
        }
    } else {
        // 桌面設備使用語音朗讀（依自訂模板與語言偵測）
        if (speechSynth) {
            const saved = JSON.parse(localStorage.getItem('voiceSettings') || '{}');
            const template = type === 'arrived'
                ? (saved.broadcastTemplateArrived || CONFIG.DEFAULT_TEMPLATE_ARRIVED)
                : (saved.broadcastTemplatePickup || CONFIG.DEFAULT_TEMPLATE_PICKUP);
            // 將多位小朋友展開為單一一句話
            const filled = fillTemplateForMultiple(template, boradcast_student_names);
            enqueueSpeech(filled);
        }
    }
}

// 載入儲存的語音設置
function loadSavedSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('voiceSettings') || '{}');
    if (savedSettings.chineseVoice) {
        chineseVoice = voices.find(v => v.name === savedSettings.chineseVoice);
    }
    if (savedSettings.englishVoice) {
        englishVoice = voices.find(v => v.name === savedSettings.englishVoice);
    }
    if (savedSettings.speechRate) {
        speechRate = savedSettings.speechRate;
        const rateRange = document.getElementById('rateRange');
        const rateValue = document.getElementById('rateValue');
        if (rateRange) rateRange.value = speechRate;
        if (rateValue) rateValue.textContent = speechRate;
    }
    const broadcastTemplatePickup = savedSettings.broadcastTemplatePickup || CONFIG.DEFAULT_TEMPLATE_PICKUP;
    const broadcastTemplateArrived = savedSettings.broadcastTemplateArrived || CONFIG.DEFAULT_TEMPLATE_ARRIVED;
    const tpl1 = document.getElementById('broadcastTemplatePickup');
    const tpl2 = document.getElementById('broadcastTemplateArrived');
    if (tpl1) tpl1.value = broadcastTemplatePickup;
    if (tpl2) tpl2.value = broadcastTemplateArrived;
    return { broadcastTemplatePickup, broadcastTemplateArrived };
}

// 儲存語音設置
function saveSettings() {
    const tplPickup = document.getElementById('broadcastTemplatePickup');
    const tplArrived = document.getElementById('broadcastTemplateArrived');
    const settings = {
        chineseVoice: chineseVoice?.name,
        englishVoice: englishVoice?.name,
        speechRate: speechRate,
        broadcastTemplatePickup: (tplPickup?.value || CONFIG.DEFAULT_TEMPLATE_PICKUP || '').trim(),
        broadcastTemplateArrived: (tplArrived?.value || CONFIG.DEFAULT_TEMPLATE_ARRIVED || '').trim()
    };
    localStorage.setItem('voiceSettings', JSON.stringify(settings));
    return settings;
}

// 更新語音選擇下拉選單
function updateVoiceSelects() {
    const chineseSelect = document.getElementById('chineseVoiceSelect');
    const englishSelect = document.getElementById('englishVoiceSelect');
    
    if (!chineseSelect || !englishSelect) return;
    
    chineseSelect.innerHTML = '';
    englishSelect.innerHTML = '';

    // 添加預設選項
    const defaultChineseOption = document.createElement('option');
    defaultChineseOption.value = '';
    defaultChineseOption.textContent = '請選擇中文語音';
    chineseSelect.appendChild(defaultChineseOption);

    const defaultEnglishOption = document.createElement('option');
    defaultEnglishOption.value = '';
    defaultEnglishOption.textContent = '請選擇英文語音';
    englishSelect.appendChild(defaultEnglishOption);

    voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        
        if (voice.lang.startsWith('zh')) {
            chineseSelect.appendChild(option);
            if (chineseVoice && voice.name === chineseVoice.name) {
                option.selected = true;
            }
        } else if (voice.lang.startsWith('en')) {
            englishSelect.appendChild(option);
            if (englishVoice && voice.name === englishVoice.name) {
                option.selected = true;
            }
        }
    });
}

// 測試語音播放
function speakSegments(segments, index = 0) {
    const playTest = document.getElementById('playTest');
    const pauseTest = document.getElementById('pauseTest');
    
    if (index >= segments.length) {
        isTestPlaying = false;
        if (playTest) playTest.disabled = false;
        if (pauseTest) pauseTest.disabled = true;
        return;
    }

    const segment = segments[index];
    const utterance = new SpeechSynthesisUtterance(segment.text);
    utterance.voice = segment.isChinese ? chineseVoice : englishVoice;
    utterance.rate = speechRate;

    utterance.onend = () => {
        if (isTestPlaying) {
            speakSegments(segments, index + 1);
        }
    };

    speechSynth.speak(utterance);
}

// 取得語音相關變數（供其他模組使用）
function getSpeechVars() {
    return {
        speechSynth,
        voices,
        chineseVoice,
        englishVoice,
        speechRate,
        isTestPlaying,
        system
    };
}

// 設定語音相關變數（供其他模組使用）
function setSpeechVars(vars) {
    if (vars.chineseVoice !== undefined) chineseVoice = vars.chineseVoice;
    if (vars.englishVoice !== undefined) englishVoice = vars.englishVoice;
    if (vars.speechRate !== undefined) speechRate = vars.speechRate;
    if (vars.isTestPlaying !== undefined) isTestPlaying = vars.isTestPlaying;
}

