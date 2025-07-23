const socket = io();

let currentState = {
    isRunning: false,
    isWorkTime: true,
    timeLeft: 50 * 60,
    participants: []
};

let isJoined = false;

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
    progressRing: document.getElementById('progressRing')
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

elements.joinBtn.addEventListener('click', joinRoom);
elements.startBtn.addEventListener('click', () => socket.emit('startPomodoro'));
elements.stopBtn.addEventListener('click', () => socket.emit('stopPomodoro'));
elements.resetBtn.addEventListener('click', () => socket.emit('resetPomodoro'));

elements.usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinRoom();
    }
});

function joinRoom() {
    if (!isJoined) {
        const username = elements.usernameInput.value.trim() || 'Anonymous';
        socket.emit('joinRoom', username);
        isJoined = true;
        elements.joinBtn.textContent = '参加中';
        elements.joinBtn.disabled = true;
        elements.usernameInput.disabled = true;
    }
}

socket.on('pomodoroState', (state) => {
    currentState = state;
    updateUI();
});

socket.on('participantUpdate', (participants) => {
    currentState.participants = participants;
    updateParticipants();
});

socket.on('phaseChange', (data) => {
    showNotification(data.message, data.isWorkTime);
});

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
}

function updateProgressRing() {
    const totalTime = currentState.isWorkTime ? 50 * 60 : 10 * 60;
    const progress = (totalTime - currentState.timeLeft) / totalTime;
    const circumference = 2 * Math.PI * 120;
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
        
        elements.participantsList.appendChild(participantElement);
    });
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

updateUI();