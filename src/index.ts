import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import Redis from 'ioredis';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { RedisStore } from 'connect-redis';
import authRoutes from './routes/auth.route';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
});

// Setup Redis
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const store = new RedisStore({
      client :redisClient,
      prefix : "sess"
})
// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    store: store,
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

// Routes
app.use('/api/auth', authRoutes);

// Extend Socket type
interface CustomSocket extends Socket {
  userId?: string;
}

// Socket Auth + Session Tracking
const userSocketMap = new Map<string, string>();

io.use(async (socket: CustomSocket, next) => {
  const token = socket.handshake.auth.token;

  try {
    if (!token) throw new Error('No token provided');

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    const storedToken = await redisClient.get(`user:${decoded.id}`);

    if (storedToken !== token) throw new Error('Invalid session');

    socket.userId = decoded.id;
    userSocketMap.set(decoded.id, socket.id);

    next();
  } catch (err) {
    next(new Error('Unauthorized'));
  }
});

// Socket Events
io.on('connection', (socket: CustomSocket) => {
  console.log(` Socket connected: ${socket.id}, UserID: ${socket.userId}`);

  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
    io.to(roomId).emit('message', `${socket.userId} joined room ${roomId}`);
  });

  socket.on('sendMessage', ({ roomId, message }: { roomId: string; message: string }) => {
    io.to(roomId).emit('message', `${socket.userId}: ${message}`);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      userSocketMap.delete(socket.userId);
    }
    console.log(`Socket disconnected: ${socket.id}, UserID: ${socket.userId}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});
