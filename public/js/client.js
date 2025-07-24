// Vercel Functions compatible client - Polling-based real-time sync

let currentState = {
    isRunning: false,
    isWorkTime: true,
    timeLeft: 50 * 60,
    participants: []
};

let isJoined = false;
let participantId = null;
let pollingInterval = null;
// let workMinutes = 50;
// let breakMinutes = 10;
// let startTime = null;

const elements = {
    usernameInput: document.getElementById('usernameInput'),
    joinBtn: document.getElementById('joinBtn'),
    phaseText: document.getElementById('phaseText'),
    timeDisplay: document.getElementById('timeDisplay'),
    phaseDescription: document.getElementById('phaseDescription'),
    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    resetBtn: document.getElementById('resetBtn'),
    participantCount: document.getElementById('participantCount'),
    participantsList: document.getElementById('participantsList'),
    notification: document.getElementById('notification'),
    progressRing: document.getElementById('progressRing'),
    leaveBtn: document.getElementById('leaveBtn'),
    currentTime: document.getElementById('currentTime'),
    endTime: document.getElementById('endTime'),
    // settingsForm: document.getElementById('settingsForm'), // 設定フォーム関連のロジック削除済み
    // startTimeInput: document.getElementById('startTimeInput'), // 設定フォーム関連のロジック削除済み
    // workMinutesInput: document.getElementById('workMinutesInput'), // 設定フォーム関連のロジック削除済み
    // breakMinutesInput: document.getElementById('breakMinutesInput'), // 設定フォーム関連のロジック削除済み
    // startHourInput: document.getElementById('startHourInput'), // 設定フォーム関連のロジック削除済み
    // startMinuteInput: document.getElementById('startMinuteInput'), // 設定フォーム関連のロジック削除済み
};

const avatarColors = [
    '#FF5A5F', '#00A699', '#FC642D', '#FFD93D', 
    '#767676', '#008489', '#FF7849', '#9C44D6',
    '#FF385C', '#00848A', '#E91E63', '#673AB7'
];

function getAvatarColor(index) {
    return avatarColors[index % avatarColors.length];
}

function getInitials(name) {
    return name.split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
}

function generateParticipantId() {
    return 'participant_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

async function apiCall(method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch('/api/socket', options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        return null;
    }
}

async function pollState() {
    const response = await apiCall('GET');
    if (response) {
        currentState = response.state;
        
        // Handle events
        if (response.events && response.events.length > 0) {
            response.events.forEach(event => {
                if (event.type === 'phaseChange') {
                    showNotification(event.data.message, event.data.isWorkTime);
                    playAlertSound();
                }
            });
        }
        
        updateUI();
    }
}

async function sendHeartbeat() {
    if (isJoined && participantId) {
        await apiCall('POST', {
            action: 'heartbeat',
            data: { participantId }
        });
    }
}

function startPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    
    // Poll every 1 second for real-time feel
    pollingInterval = setInterval(pollState, 1000);
    
    // Send heartbeat every 10 seconds
    setInterval(sendHeartbeat, 10000);
}

window.addEventListener('DOMContentLoaded', () => {
    // 時間セレクト初期化
    // 設定フォーム関連のロジック削除済み
});

elements.joinBtn.addEventListener('click', joinRoom);
elements.startBtn.addEventListener('click', () => sendAction('startPomodoro'));
elements.stopBtn.addEventListener('click', () => sendAction('stopPomodoro'));
elements.resetBtn.addEventListener('click', () => sendAction('resetPomodoro'));
elements.leaveBtn.addEventListener('click', leaveRoom);
// elements.settingsForm.addEventListener('submit', (e) => { // 設定フォーム関連のロジック削除済み
//     e.preventDefault();
//     const workMinutes = parseInt(elements.workMinutesInput.value, 10);
//     const breakMinutes = parseInt(elements.breakMinutesInput.value, 10);
//     // セレクトから開始時間を組み立て
//     const hour = elements.startHourInput.value;
//     const min = elements.startMinuteInput.value;
//     const startTime = `${hour}:${min}`;
//     sendAction('setSettings', {
//         workMinutes,
//         breakMinutes,
//         startTime
//     });
//     // サーバーから返ってきたstateでのみUIを更新する
// });

elements.usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinRoom();
    }
});

async function joinRoom() {
    if (!isJoined) {
        const username = elements.usernameInput.value.trim() || 'Anonymous';
        participantId = generateParticipantId();
        
        const response = await apiCall('POST', {
            action: 'joinRoom',
            data: { username, participantId }
        });
        
        if (response && response.success) {
            // サーバーからの状態を即座に反映
            currentState = response.state;
            updateUI();
            
            isJoined = true;
            elements.joinBtn.textContent = '参加中';
            elements.joinBtn.disabled = true;
            elements.usernameInput.disabled = true;
            
            // Start polling after joining
            startPolling();
            // 参加直後に即座にheartbeatを送信
            sendHeartbeat();
        }
    }
}

async function sendAction(action, data = {}) {
    const response = await apiCall('POST', {
        action: action,
        data: data
    });
    // サーバーから state が返れば即時反映
    if (response && response.state) {
        currentState = response.state;
        updateUI();
    } else {
        // 返らなければ即時ポーリング
        pollState();
    }
}

async function leaveRoom() {
    if (isJoined && participantId) {
        await sendAction('leaveRoom', { participantId });
        isJoined = false;
        participantId = null;
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
        // UIリセット
        elements.joinBtn.textContent = '参加する';
        elements.joinBtn.disabled = false;
        elements.usernameInput.disabled = false;
        elements.usernameInput.value = '';
        currentState = {
            isRunning: false,
            isWorkTime: true,
            timeLeft: 50 * 60,
            participants: []
        };
        updateUI();
    }
}

function updateUI() {
    elements.phaseText.textContent = currentState.isWorkTime ? '作業時間' : '休憩時間';
    elements.phaseText.className = currentState.isWorkTime ? 'phase-badge' : 'phase-badge break-time';
    
    elements.timeDisplay.textContent = formatTime(currentState.timeLeft);
    elements.timeDisplay.className = currentState.isWorkTime ? 'time-display' : 'time-display break-time';
    
    elements.phaseDescription.textContent = currentState.isWorkTime 
        ? '集中して作業しましょう' 
        : 'リラックスして休憩しましょう';
    
    elements.startBtn.disabled = currentState.isRunning;
    elements.stopBtn.disabled = !currentState.isRunning;
    
    updateProgressRing();
    updateParticipants();
    updateTimeMeta();
}

function updateProgressRing() {
    let timeLeft = currentState.timeLeft;
    if (typeof timeLeft !== 'number' || isNaN(timeLeft) || timeLeft < 0) timeLeft = 50 * 60;
    const totalTime = currentState.isWorkTime ? 50 * 60 : 10 * 60;
    const circumference = 2 * Math.PI * 120;
    elements.progressRing.setAttribute('stroke-dasharray', circumference);
    if (totalTime <= 0) {
        elements.progressRing.style.strokeDashoffset = 0;
        return;
    }
    const progress = (totalTime - timeLeft) / totalTime;
    const offset = circumference * (1 - progress);
    elements.progressRing.style.strokeDashoffset = offset;
    elements.progressRing.className = currentState.isWorkTime 
        ? 'progress-ring-foreground' 
        : 'progress-ring-foreground break-time';
}

function updateParticipants() {
    elements.participantCount.textContent = currentState.participants.length;
    elements.participantsList.innerHTML = '';
    
    currentState.participants.forEach((participant, index) => {
        const participantElement = document.createElement('div');
        participantElement.className = 'participant-item';
        
        const avatar = document.createElement('div');
        avatar.className = 'participant-avatar';
        avatar.style.backgroundColor = getAvatarColor(index);
        avatar.textContent = getInitials(participant.username);
        
        const nameElement = document.createElement('div');
        nameElement.className = 'participant-name';
        nameElement.textContent = participant.username;
        
        const statusElement = document.createElement('div');
        statusElement.className = 'participant-status';
        
        participantElement.appendChild(avatar);
        participantElement.appendChild(nameElement);
        participantElement.appendChild(statusElement);
        
        // 自分自身の参加者リスト項目にだけ退出ボタンを表示
        if (participantId && participant.id === participantId) {
            const leaveBtn = document.createElement('button');
            leaveBtn.className = 'participant-leave-btn';
            leaveBtn.textContent = '退出';
            leaveBtn.onclick = leaveRoom;
            participantElement.appendChild(leaveBtn);
        }
        
        elements.participantsList.appendChild(participantElement);
    });
}

function updateTimeMeta() {
    // 現在時刻
    const now = new Date();
    elements.currentTime.textContent = `現在時刻: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    // 終了予定時刻
    const end = new Date(now.getTime() + currentState.timeLeft * 1000);
    elements.endTime.textContent = `終了予定: ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function showNotification(message, isWorkTime) {
    elements.notification.textContent = message;
    elements.notification.className = `notification-toast ${isWorkTime ? 'work-phase' : 'break-phase'} show`;
    
    setTimeout(() => {
        elements.notification.classList.remove('show');
    }, 4000);
}

// アラート音
const alertAudio = new Audio('/alert.mp3');

function playAlertSound() {
    alertAudio.currentTime = 0;
    alertAudio.play().catch(() => {});
}

// Initialize the app
// Start polling immediately for initial state
pollState();

// 現在時刻の自動更新
setInterval(() => {
    if (isJoined) updateTimeMeta();
}, 1000);