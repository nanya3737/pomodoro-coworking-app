// Vercel Function for Pomodoro Timer API
// Supports GET, POST, PUT, DELETE methods for polling-based real-time sync

let pomodoroState = {
  isRunning: false,
  isWorkTime: true,
  timeLeft: 50 * 60,
  participants: [],
  lastUpdated: Date.now(),
  timerId: null
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
  // レスポンス用の状態オブジェクトを作成（timerIdを除外）
  return {
    isRunning: pomodoroState.isRunning,
    isWorkTime: pomodoroState.isWorkTime,
    timeLeft: pomodoroState.timeLeft,
    participants: pomodoroState.participants,
    lastUpdated: pomodoroState.lastUpdated
  };
}

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method, query, body } = req;
  cleanupOldParticipants();

  switch (method) {
    case 'GET':
      // Get current state and events
      const events = [...eventQueue];
      eventQueue = []; // Clear events after sending
      
      res.status(200).json({
        state: getResponseState(),
        events: events
      });
      break;

    case 'POST':
      // Handle different actions
      const { action, data } = body;
      
      switch (action) {
        case 'joinRoom':
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
          break;

        case 'startPomodoro':
          if (!pomodoroState.isRunning) {
            pomodoroState.isRunning = true;
            pomodoroState.lastUpdated = Date.now();
            startTimer();
          }
          break;

        case 'stopPomodoro':
          pomodoroState.isRunning = false;
          pomodoroState.lastUpdated = Date.now();
          if (pomodoroState.timerId) {
            clearInterval(pomodoroState.timerId);
            pomodoroState.timerId = null;
          }
          break;

        case 'resetPomodoro':
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

        case 'heartbeat':
          // Update participant's last seen time
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

        default:
          res.status(400).json({ error: 'Invalid action' });
          return;
      }
      
      res.status(200).json({ success: true, state: getResponseState() });
      break;

    default:
      res.status(405).json({ error: 'Method not allowed' });
      break;
  }
}