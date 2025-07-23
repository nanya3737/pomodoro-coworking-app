const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../public')));

let pomodoroState = {
  isRunning: false,
  isWorkTime: true,
  timeLeft: 50 * 60,
  participants: []
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.emit('pomodoroState', pomodoroState);
  
  socket.on('joinRoom', (username) => {
    if (!pomodoroState.participants.find(p => p.id === socket.id)) {
      pomodoroState.participants.push({
        id: socket.id,
        username: username || 'Anonymous'
      });
      io.emit('participantUpdate', pomodoroState.participants);
    }
  });
  
  socket.on('startPomodoro', () => {
    if (!pomodoroState.isRunning) {
      pomodoroState.isRunning = true;
      io.emit('pomodoroState', pomodoroState);
      startTimer();
    }
  });
  
  socket.on('stopPomodoro', () => {
    pomodoroState.isRunning = false;
    io.emit('pomodoroState', pomodoroState);
  });
  
  socket.on('resetPomodoro', () => {
    pomodoroState.isRunning = false;
    pomodoroState.isWorkTime = true;
    pomodoroState.timeLeft = 50 * 60;
    io.emit('pomodoroState', pomodoroState);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    pomodoroState.participants = pomodoroState.participants.filter(p => p.id !== socket.id);
    io.emit('participantUpdate', pomodoroState.participants);
  });
});

function startTimer() {
  const timer = setInterval(() => {
    if (!pomodoroState.isRunning) {
      clearInterval(timer);
      return;
    }
    
    pomodoroState.timeLeft--;
    
    if (pomodoroState.timeLeft <= 0) {
      pomodoroState.isWorkTime = !pomodoroState.isWorkTime;
      pomodoroState.timeLeft = pomodoroState.isWorkTime ? 50 * 60 : 10 * 60;
      
      io.emit('phaseChange', {
        isWorkTime: pomodoroState.isWorkTime,
        message: pomodoroState.isWorkTime ? '作業時間開始！' : '休憩時間開始！'
      });
    }
    
    io.emit('pomodoroState', pomodoroState);
  }, 1000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});