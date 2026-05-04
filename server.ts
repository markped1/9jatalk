import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import Database from "better-sqlite3";
import { GoogleGenerativeAI } from "@google/generative-ai";

// AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Initializing Database
const db = new Database("9jatalk_messaging.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phoneNumber TEXT UNIQUE,
    username TEXT,
    email TEXT,
    lastSeen DATETIME,
    pushEnabled INTEGER DEFAULT 1,
    readReceipts INTEGER DEFAULT 1,
    lastSeenStatus INTEGER DEFAULT 1,
    ringtone TEXT DEFAULT 'Default',
    messageTone TEXT DEFAULT 'Default',
    ringtoneType TEXT DEFAULT 'audio',
    avatarUrl TEXT,
    screenshotProtection INTEGER DEFAULT 0,
    disappearingTimer INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS user_ringtones (
    id TEXT PRIMARY KEY,
    userId TEXT,
    name TEXT,
    url TEXT,
    type TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS linked_devices (
    id TEXT PRIMARY KEY,
    userId TEXT,
    deviceName TEXT,
    deviceType TEXT,
    browser TEXT,
    lastActive DATETIME,
    location TEXT,
    ip TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    senderId TEXT,
    receiverId TEXT,
    content TEXT,
    type TEXT,
    status TEXT DEFAULT 'sent',
    reactions TEXT DEFAULT '[]',
    expiresAt DATETIME,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT,
    createdBy TEXT,
    disappearingTimer INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS group_members (
    groupId TEXT,
    userId TEXT,
    PRIMARY KEY (groupId, userId)
  );

  CREATE TABLE IF NOT EXISTS status_updates (
    id TEXT PRIMARY KEY,
    userId TEXT,
    content TEXT,
    type TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiresAt DATETIME,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

// Seed Support User
const supportId = '12345';
const supportUser = db.prepare('SELECT * FROM users WHERE id = ?').get(supportId);
if (!supportUser) {
  db.prepare('INSERT INTO users (id, phoneNumber, username, lastSeen) VALUES (?, ?, ?, ?)')
    .run(supportId, '12345', '9jaTalk Support', new Date().toISOString());
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(express.json());
  app.use("/uploads", express.static(uploadDir));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI Endpoints
  app.post("/api/ai/translate", async (req, res) => {
    const { text, targetLang } = req.body;
    try {
      const prompt = `Translate this message to ${targetLang}. Only return the translated text without any explanations: "${text}"`;
      const result = await model.generateContent(prompt);
      res.json({ translatedText: result.response.text() });
    } catch (err) {
      console.error("AI Translation error:", err);
      res.status(500).json({ error: "Translation failed" });
    }
  });

  app.post("/api/ai/suggestions", async (req, res) => {
    const { lastMessages } = req.body; // Array of strings or objects
    try {
      const prompt = `Based on these last messages: ${JSON.stringify(lastMessages)}, provide 3-4 short, casual, and appropriate smart replies. Return only as a JSON array of strings. Examples: ["Sounds good!", "I'm busy right now.", "Can't wait!", "Yes please"]`;
      const result = await model.generateContent(prompt);
      const output = result.response.text();
      // Try to parse the array
      const match = output.match(/\[.*\]/s);
      const suggestions = match ? JSON.parse(match[0]) : [];
      res.json({ suggestions });
    } catch (err) {
      console.error("AI Suggestions error:", err);
      res.status(500).json({ error: "Suggestions failed" });
    }
  });

  // Media Upload Endpoint
  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  // Fetch Message History
  app.get("/api/messages/:chatWith", (req, res) => {
    const { chatWith } = req.params;
    const currentUserId = req.query.userId; // Simplified auth for demo

    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (senderId = ? AND receiverId = ?) 
      OR (senderId = ? AND receiverId = ?)
      ORDER BY timestamp ASC
    `).all(currentUserId, chatWith, chatWith, currentUserId);

    res.json(messages);
  });

  // Basic User Auth
  app.post("/api/auth/verify", (req, res) => {
    const { phoneNumber } = req.body;
    
    // Register or check user in SQLite
    const user = db.prepare('SELECT * FROM users WHERE phoneNumber = ?').get(phoneNumber);
    if (!user) {
      db.prepare('INSERT INTO users (id, phoneNumber, lastSeen) VALUES (?, ?, ?)')
        .run(phoneNumber, phoneNumber, new Date().toISOString());
      const newUser = db.prepare('SELECT * FROM users WHERE phoneNumber = ?').get(phoneNumber);
      res.json({ success: true, user: newUser });
    } else {
      res.json({ success: true, user });
    }
  });

  // Update User Profile/Settings
  app.patch("/api/users/profile", (req, res) => {
    const { userId, username, email, pushEnabled, readReceipts, lastSeenStatus, ringtone, ringtoneType, messageTone, avatarUrl, screenshotProtection } = req.body;
    
    db.prepare(`
      UPDATE users 
      SET username = COALESCE(?, username),
          email = COALESCE(?, email),
          pushEnabled = COALESCE(?, pushEnabled),
          readReceipts = COALESCE(?, readReceipts),
          lastSeenStatus = COALESCE(?, lastSeenStatus),
          ringtone = COALESCE(?, ringtone),
          ringtoneType = COALESCE(?, ringtoneType),
          messageTone = COALESCE(?, messageTone),
          avatarUrl = COALESCE(?, avatarUrl),
          screenshotProtection = COALESCE(?, screenshotProtection)
      WHERE id = ?
    `).run(username, email, pushEnabled, readReceipts, lastSeenStatus, ringtone, ringtoneType, messageTone, avatarUrl, screenshotProtection, userId);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    res.json({ success: true, user: updatedUser });
  });

  // Profile Image and Ringtone Upload
  app.post("/api/users/upload", upload.single("avatar"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    res.json({ success: true, url, type: req.file.mimetype });
  });

  app.get("/api/users/:userId/ringtones", (req, res) => {
    const tones = db.prepare('SELECT * FROM user_ringtones WHERE userId = ?').all(req.params.userId);
    res.json(tones);
  });

  app.post("/api/users/:userId/ringtones", (req, res) => {
    const { name, url, type } = req.body;
    const toneId = Math.random().toString(36).substr(2, 9);
    db.prepare('INSERT INTO user_ringtones (id, userId, name, url, type) VALUES (?, ?, ?, ?, ?)')
      .run(toneId, req.params.userId, name, url, type);
    res.json({ success: true, toneId });
  });

  // Linked Devices APIs
  app.get("/api/users/:userId/devices", (req, res) => {
    const devices = db.prepare('SELECT * FROM linked_devices WHERE userId = ? ORDER BY lastActive DESC')
      .all(req.params.userId);
    res.json(devices);
  });

  app.post("/api/users/:userId/devices", (req, res) => {
    const { deviceName, deviceType, browser, location, ip } = req.body;
    const deviceId = Math.random().toString(36).substr(2, 12).toUpperCase();
    
    db.prepare(`
      INSERT INTO linked_devices (id, userId, deviceName, deviceType, browser, lastActive, location, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(deviceId, req.params.userId, deviceName, deviceType, browser, new Date().toISOString(), location, ip);
    
    res.json({ success: true, deviceId });
  });

  app.delete("/api/users/devices/:deviceId", (req, res) => {
    db.prepare('DELETE FROM linked_devices WHERE id = ?').run(req.params.deviceId);
    res.json({ success: true });
  });

  // Presence Tracking
  const onlineUsers = new Map<string, string>(); // userId -> socketId

  // User Search - More lenient
  app.get("/api/users/search/:phone", (req, res) => {
    const user = db.prepare('SELECT id, phoneNumber, username, lastSeen, disappearingTimer FROM users WHERE phoneNumber = ?').get(req.params.phone);
    if (user) {
      res.json(user);
    } else {
      // Return a virtual user to allow starting chats
      res.json({ 
        id: req.params.phone, 
        phoneNumber: req.params.phone, 
        username: `User ${req.params.phone}`,
        disappearingTimer: 0,
        virtual: true 
      });
    }
  });

  // Status APIs
  app.get("/api/status", (req, res) => {
    const now = new Date().toISOString();
    const statuses = db.prepare(`
      SELECT s.*, u.username, u.avatarUrl 
      FROM status_updates s
      JOIN users u ON s.userId = u.id
      WHERE s.expiresAt > ?
      ORDER BY s.createdAt DESC
    `).all(now);
    res.json(statuses);
  });

  app.post("/api/status", (req, res) => {
    const { userId, content, type } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    db.prepare(`
      INSERT INTO status_updates (id, userId, content, type, expiresAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, content, type, expiresAt);
    
    res.json({ success: true, id });
  });

  // Groups API
  app.post("/api/groups", (req, res) => {
    const { name, members, creatorId } = req.body;
    const groupId = Math.random().toString(36).substr(2, 9);
    
    db.prepare('INSERT INTO groups (id, name, createdBy) VALUES (?, ?, ?)')
      .run(groupId, name, creatorId);

    const insertMember = db.prepare('INSERT INTO group_members (groupId, userId) VALUES (?, ?)');
    // Ensure creator is a member, plus any others
    const allMembers = Array.from(new Set([creatorId, ...members]));
    allMembers.forEach((uid: any) => {
      insertMember.run(groupId, uid);
    });

    res.json({ success: true, groupId });
  });

  app.get("/api/groups/:userId", (req, res) => {
    const groups = db.prepare(`
      SELECT g.* FROM groups g
      JOIN group_members gm ON g.id = gm.groupId
      WHERE gm.userId = ?
    `).all(req.params.userId);
    res.json(groups);
  });

  app.get("/api/groups/:groupId/members", (req, res) => {
    const members = db.prepare(`
      SELECT u.id, u.phoneNumber, u.username 
      FROM users u
      JOIN group_members gm ON u.id = gm.userId
      WHERE gm.groupId = ?
    `).all(req.params.groupId);
    res.json(members);
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("auth", (userId: string) => {
      onlineUsers.set(userId, socket.id);
      socket.join(userId);
      
      // Update last seen in DB
      db.prepare('UPDATE users SET lastSeen = ? WHERE id = ?')
        .run(new Date().toISOString(), userId);

      console.log(`User ${userId} authenticated`);
      io.emit("status:online", userId);
    });

    socket.on("message:send", (data: { receiverId: string, content: string, type: string, isGroup?: boolean }) => {
      const senderId = [...onlineUsers.entries()].find(([_, sid]) => sid === socket.id)?.[0];
      if (!senderId) return;

      // Check disappearing timer
      let timer = 0;
      if (data.isGroup) {
        const group: any = db.prepare('SELECT disappearingTimer FROM groups WHERE id = ?').get(data.receiverId);
        timer = group?.disappearingTimer || 0;
      } else {
        const user: any = db.prepare('SELECT disappearingTimer FROM users WHERE id = ?').get(data.receiverId);
        timer = user?.disappearingTimer || 0;
      }

      const expiresAt = timer > 0 ? new Date(Date.now() + timer * 1000).toISOString() : null;

      const message = {
        id: Math.random().toString(36).substr(2, 9),
        senderId,
        receiverId: data.receiverId,
        content: data.content,
        type: data.type || 'text',
        status: 'sent',
        timestamp: new Date().toISOString(),
        expiresAt,
        isGroup: data.isGroup || false
      };

      // Persist to DB
      db.prepare(`
        INSERT INTO messages (id, senderId, receiverId, content, type, status, expiresAt, timestamp) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(message.id, message.senderId, message.receiverId, message.content, message.type, message.status, message.expiresAt, message.timestamp);

      if (data.isGroup) {
        // Broadcast to all members of the group
        const members = db.prepare('SELECT userId FROM group_members WHERE groupId = ?').all(data.receiverId);
        members.forEach((m: any) => {
          if (onlineUsers.has(m.userId)) {
            io.to(m.userId).emit("message:received", message);
          }
        });
      } else {
        // Broadcast to receiver's room
        io.to(data.receiverId).emit("message:received", message);
        
        // Auto-reply from Support Bot
        if (data.receiverId === '12345') {
          setTimeout(() => {
            const supportMsg = {
              id: Math.random().toString(36).substr(2, 9),
              senderId: '12345',
              receiverId: senderId,
              content: `Received: "${data.content}". Encryption check: OK.`,
              type: 'text',
              status: 'sent',
              timestamp: new Date().toISOString()
            };
            io.to(senderId).emit("message:received", supportMsg);
          }, 800);
        }
      }
      
      socket.emit("message:sent", { id: message.id, status: 'delivered' });
    });

    socket.on("message:read", (data: { senderId: string, receiverId: string }) => {
      // Mark all messages as read between these two users
      db.prepare('UPDATE messages SET status = "read" WHERE senderId = ? AND receiverId = ? AND status != "read"')
        .run(data.senderId, data.receiverId);
      
      io.to(data.senderId).emit("status:read", { readerId: data.receiverId });
    });

    socket.on("status:typing", (data: { receiverId: string, isTyping: boolean }) => {
      const senderId = [...onlineUsers.entries()].find(([_, sid]) => sid === socket.id)?.[0];
      if (senderId) {
        io.to(data.receiverId).emit("user:typing", { userId: senderId, isTyping: data.isTyping });
      }
    });

    socket.on("message:react", (data: { messageId: string, emoji: string, receiverId: string }) => {
      const senderId = [...onlineUsers.entries()].find(([_, sid]) => sid === socket.id)?.[0];
      if (!senderId) return;

      const msg: any = db.prepare('SELECT reactions FROM messages WHERE id = ?').get(data.messageId);
      if (msg) {
        let reactions = JSON.parse(msg.reactions || '[]');
        // Toggle reaction
        const existingIdx = reactions.findIndex((r: any) => r.userId === senderId);
        if (existingIdx > -1) {
          if (reactions[existingIdx].emoji === data.emoji) {
            reactions.splice(existingIdx, 1);
          } else {
            reactions[existingIdx].emoji = data.emoji;
          }
        } else {
          reactions.push({ userId: senderId, emoji: data.emoji });
        }
        
        db.prepare('UPDATE messages SET reactions = ? WHERE id = ?').run(JSON.stringify(reactions), data.messageId);
        
        // Broadcast to relevant rooms
        io.to(data.receiverId).emit("message:reaction_update", { messageId: data.messageId, reactions });
        io.to(senderId).emit("message:reaction_update", { messageId: data.messageId, reactions });
      }
    });

    socket.on("call:initiate", (data: { receiverId: string, type: 'voice' | 'video', signal: any, isGroup?: boolean }) => {
      const senderId = [...onlineUsers.entries()].find(([_, sid]) => sid === socket.id)?.[0];
      if (!senderId) return;

      if (data.isGroup) {
        // Send call invitation to all group members except sender
        const members = db.prepare('SELECT userId FROM group_members WHERE groupId = ?').all(data.receiverId);
        members.forEach((m: any) => {
          if (m.userId !== senderId) {
            io.to(m.userId).emit("call:incoming", { senderId, type: data.type, signal: data.signal, groupId: data.receiverId });
          }
        });
      } else {
        io.to(data.receiverId).emit("call:incoming", { senderId, type: data.type, signal: data.signal });
      }
    });

    socket.on("call:answer", (data: { receiverId: string, signal: any, isGroup?: boolean, groupId?: string }) => {
      const senderId = [...onlineUsers.entries()].find(([_, sid]) => sid === socket.id)?.[0];
      if (senderId) {
        // In group calls, we need to know which peer we are answering
        io.to(data.receiverId).emit("call:answered", { senderId, signal: data.signal, groupId: data.groupId });
      }
    });

    socket.on("call:reject", (data: { receiverId: string }) => {
      io.to(data.receiverId).emit("call:rejected");
    });

    socket.on("call:end", (data: { receiverId: string }) => {
      io.to(data.receiverId).emit("call:ended");
    });

    socket.on("disconnect", () => {
      const userId = [...onlineUsers.entries()].find(([_, sid]) => sid === socket.id)?.[0];
      if (userId) {
        onlineUsers.delete(userId);
        io.emit("status:offline", userId);
      }
      console.log("User disconnected");
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
