import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ---- Pomodoro State ----
let pomodoroState = {
  isRunning: false,
  isWorkTime: true,
  timeLeft: 50 * 60,
  participants: [],
  lastUpdated: Date.now(),
  timerId: null,
  workMinutes: 50,
  breakMinutes: 10,
  startTime: null
};

let eventQueue = [];

function startTimer() {
  if (pomodoroState.timerId) {
    clearInterval(pomodoroState.timerId);
  }
  
  console.log('[TIMER] startTimer called. Current state:', JSON.stringify(pomodoroState));
  pomodoroState.timerId = setInterval(() => {
    if (!pomodoroState.isRunning) {
      clearInterval(pomodoroState.timerId);
      pomodoroState.timerId = null;
      return;
    }
    
    pomodoroState.timeLeft--;
    if (pomodoroState.timeLeft < 0) pomodoroState.timeLeft = 0;
    pomodoroState.lastUpdated = Date.now();
    
    if (pomodoroState.timeLeft <= 0) {
      pomodoroState.isWorkTime = !pomodoroState.isWorkTime;
      pomodoroState.timeLeft = pomodoroState.isWorkTime ? 50 * 60 : 10 * 60;
      
      // Add phase change event to queue
      eventQueue.push({
        type: 'phaseChange',
        data: {
          isWorkTime: pomodoroState.isWorkTime,
          message: pomodoroState.isWorkTime ? '作業時間開始！' : '休憩時間開始！'
        },
        timestamp: Date.now()
      });
      console.log('[TIMER] Phase changed. New state:', JSON.stringify(pomodoroState));
    }
  }, 1000);
}

function cleanupOldParticipants() {
  const now = Date.now();
  const timeout = 30000; // 30 seconds timeout
  const before = pomodoroState.participants.length;
  pomodoroState.participants = pomodoroState.participants.filter(
    participant => (now - participant.lastSeen) < timeout
  );
  const after = pomodoroState.participants.length;
  if (before !== after) {
    console.log(`[CLEANUP] Removed ${before - after} participants. Remaining:`, JSON.stringify(pomodoroState.participants));
  }
}

function getResponseState() {
  return {
    isRunning: pomodoroState.isRunning,
    isWorkTime: pomodoroState.isWorkTime,
    timeLeft: pomodoroState.timeLeft,
    participants: pomodoroState.participants,
    lastUpdated: pomodoroState.lastUpdated,
    workMinutes: pomodoroState.workMinutes,
    breakMinutes: pomodoroState.breakMinutes,
    startTime: pomodoroState.startTime
  };
}

app.all('/api/socket', (req, res) => {
  // CORS対応（必要なら）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  cleanupOldParticipants();

  if (req.method === 'GET') {
    const events = [...eventQueue];
    eventQueue = [];
    res.status(200).json({
      state: getResponseState(),
      events: events
    });
    return;
  }

  if (req.method === 'POST') {
    const { action, data } = req.body;
    switch (action) {
      case 'joinRoom': {
        const existingParticipant = pomodoroState.participants.find(
          p => p.id === data.participantId
        );
        if (existingParticipant) {
          existingParticipant.username = data.username;
          existingParticipant.lastSeen = Date.now();
          console.log(`[JOIN] Updated participant:`, JSON.stringify(existingParticipant));
        } else {
          const newParticipant = {
            id: data.participantId,
            username: data.username,
            lastSeen: Date.now()
          };
          pomodoroState.participants.push(newParticipant);
          console.log(`[JOIN] Added participant:`, JSON.stringify(newParticipant));
        }
        pomodoroState.lastUpdated = Date.now();
        // 誰かが参加したら自動でタイマー開始
        if (!pomodoroState.isRunning) {
          pomodoroState.isRunning = true;
          pomodoroState.lastUpdated = Date.now();
          startTimer();
        }
        break;
      }
      case 'startPomodoro': {
        if (!pomodoroState.isRunning) {
          pomodoroState.isRunning = true;
          pomodoroState.lastUpdated = Date.now();
          startTimer();
        }
        break;
      }
      case 'stopPomodoro': {
        pomodoroState.isRunning = false;
        pomodoroState.lastUpdated = Date.now();
        if (pomodoroState.timerId) {
          clearInterval(pomodoroState.timerId);
          pomodoroState.timerId = null;
        }
        break;
      }
      case 'resetPomodoro': {
        pomodoroState.isRunning = false;
        pomodoroState.isWorkTime = true;
        pomodoroState.timeLeft = 50 * 60;
        pomodoroState.lastUpdated = Date.now();
        if (pomodoroState.timerId) {
          clearInterval(pomodoroState.timerId);
          pomodoroState.timerId = null;
        }
        console.log('[RESET] Pomodoro state reset:', JSON.stringify(pomodoroState));
        break;
      }
      case 'heartbeat': {
        const participant = pomodoroState.participants.find(
          p => p.id === data.participantId
        );
        if (participant) {
          participant.lastSeen = Date.now();
          console.log(`[HEARTBEAT] Updated lastSeen for:`, JSON.stringify(participant));
        } else {
          console.log(`[HEARTBEAT] No participant found for id:`, data.participantId);
        }
        break;
      }
      case 'leaveRoom': {
        const before = pomodoroState.participants.length;
        pomodoroState.participants = pomodoroState.participants.filter(
          p => p.id !== data.participantId
        );
        const after = pomodoroState.participants.length;
        if (before !== after) {
          console.log(`[LEAVE] Removed participant id: ${data.participantId}`);
        } else {
          console.log(`[LEAVE] No participant found for id: ${data.participantId}`);
        }
        pomodoroState.lastUpdated = Date.now();
        break;
      }
      default: {
        res.status(400).json({ error: 'Invalid action' });
        return;
      }
    }
    res.status(200).json({ success: true, state: getResponseState() });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
});

app.listen(PORT, () => {
  console.log(`Pomodoro server running at http://localhost:${PORT}`);
}); 