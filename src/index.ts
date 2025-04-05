import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import Redis from 'ioredis';
// import connectRedis from 'connect-redis';
import { RedisStore } from 'connect-redis';
import { Server as SocketIOServer } from 'socket.io';
import authRoutes from './routes/auth.route';
import { Client } from 'socket.io/dist/client';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});


const redisClient = new Redis(); 

const store = new RedisStore({
      client :redisClient,
      prefix : "sess"
})

// const RedisStore = connectRedis(session);
// const RedisStore = connectRedis(session)
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


io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
