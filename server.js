import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import { LocalStorage } from 'node-localstorage';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Store active chat sessions per user
let activeChatSessions = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Initialize chat session for this user
  if (!activeChatSessions.has(socket.id)) {
    activeChatSessions.set(socket.id, {
      socketId: socket.id,
      messages: [],
      lastActivity: new Date(),
      status: 'active'
    });
  }

  // Handle user messages
  socket.on('userMessage', (data) => {
    console.log('User message:', data);

    // Get or create chat session for this user
    let chatSession = activeChatSessions.get(socket.id);
    if (!chatSession) {
      chatSession = {
        socketId: socket.id,
        messages: [],
        lastActivity: new Date(),
        status: 'active'
      };
      activeChatSessions.set(socket.id, chatSession);
    }

    // Add message to session
    const message = {
      type: 'user',
      content: data.content,
      timestamp: data.timestamp,
      socketId: socket.id
    };
    chatSession.messages.push(message);
    chatSession.lastActivity = new Date();

    // Broadcast to admin clients
    socket.broadcast.emit('userMessage', {
      socketId: socket.id,
      session: chatSession,
      ...data
    });
  });

  // Handle admin messages
  socket.on('adminMessage', (data) => {
    console.log('Admin message:', data);

    // Get chat session for target user
    const targetSocketId = data.targetSocketId;
    let chatSession = activeChatSessions.get(targetSocketId);

    if (!chatSession) {
      // Create session if it doesn't exist
      chatSession = {
        socketId: targetSocketId,
        messages: [],
        lastActivity: new Date(),
        status: 'active'
      };
      activeChatSessions.set(targetSocketId, chatSession);
    }

    // Add message to session
    const message = {
      type: 'admin',
      content: data.content,
      timestamp: data.timestamp,
      socketId: targetSocketId
    };
    chatSession.messages.push(message);
    chatSession.lastActivity = new Date();

    // Send to specific user
    if (targetSocketId) {
      io.to(targetSocketId).emit('adminMessage', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Mark session as inactive but keep messages
    const session = activeChatSessions.get(socket.id);
    if (session) {
      session.status = 'inactive';
      session.lastActivity = new Date();
    }
  });
});

// API Routes
app.get('/api/analytics', (req, res) => {
  try {
    const analytics = JSON.parse(localStorage.getItem('siteAnalytics') || '{}');
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.get('/api/feedback', (req, res) => {
  try {
    const feedbacks = JSON.parse(localStorage.getItem('siteFeedbacks') || '[]');
    res.json(feedbacks);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

app.post('/api/feedback', (req, res) => {
  try {
    const feedback = req.body;
    const feedbacks = JSON.parse(localStorage.getItem('siteFeedbacks') || '[]');
    feedbacks.push(feedback);
    localStorage.setItem('siteFeedbacks', JSON.stringify(feedbacks));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

app.get('/api/chat-sessions', (req, res) => {
  try {
    const sessions = [];
    activeChatSessions.forEach((session, socketId) => {
      if (session.messages && session.messages.length > 0) {
        sessions.push({
          socketId: socketId,
          messages: session.messages,
          status: session.status,
          lastActivity: session.lastActivity
        });
      }
    });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
});

// Polyfill for localStorage in Node.js
if (typeof localStorage === 'undefined' || localStorage === null) {
  global.localStorage = new LocalStorage('./localStorage');
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
