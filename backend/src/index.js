require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db/connection');

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
  : true;

const corsOptions = { origin: allowedOrigins, credentials: true };

const io = new Server(server, { cors: corsOptions });
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const UPLOADS_DIR = path.join(__dirname, '../uploads');
// Sirve archivos bajo /api/uploads/ (pasa por el location /api/ de nginx)
app.use('/api/uploads', express.static(UPLOADS_DIR));
// Compatibilidad con URLs antiguas almacenadas como /uploads/
app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/events', require('./routes/events'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/grades', require('./routes/grades'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', service: 'CECUM Link API' }));

const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('user:online', (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit('users:online', Array.from(onlineUsers.keys()));
  });

  socket.on('message:send', (data) => {
    const receiverSocket = onlineUsers.get(String(data.receiver_id));
    if (receiverSocket) {
      io.to(receiverSocket).emit('message:receive', data);
    }
  });

  socket.on('post:new', (data) => {
    socket.broadcast.emit('post:new', data);
  });

  socket.on('notification:new', (data) => {
    const targetSocket = onlineUsers.get(String(data.user_id));
    if (targetSocket) io.to(targetSocket).emit('notification:new', data);
  });

  socket.on('disconnect', () => {
    for (const [userId, sid] of onlineUsers.entries()) {
      if (sid === socket.id) { onlineUsers.delete(userId); break; }
    }
    io.emit('users:online', Array.from(onlineUsers.keys()));
  });
});

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  server.listen(PORT, () => console.log(`CECUM Link API corriendo en puerto ${PORT}`));
}).catch(err => {
  console.error('Error iniciando BD:', err);
  process.exit(1);
});
