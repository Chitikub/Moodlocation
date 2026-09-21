const { Server } = require('socket.io');
const http = require('http');
const express = require('express');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ตั้งค่า Socket.IO
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN
            ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
            : ['https://moodlocation.vercel.app', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Fallback: In-memory storage (ใช้เมื่อไม่มี Redis)
const userSocketMap = new Map();

// Redis setup (optional - ถ้าไม่มี Redis จะใช้ in-memory แทน)
let redisCache = null;
let pubClient = null;
let subClient = null;

const redisUrl = process.env.REDIS_URL;

async function initRedis() {
    if (!redisUrl) {
        console.log('⚠️ ไม่พบ REDIS_URL - ใช้ in-memory storage แทน');
        return false;
    }

    try {
        pubClient = createClient({ url: redisUrl });
        subClient = pubClient.duplicate();
        redisCache = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect(), redisCache.connect()]);
        console.log('✅ Redis connected successfully for Socket.IO & Caching');
        io.adapter(createAdapter(pubClient, subClient));
        return true;
    } catch (err) {
        console.error('❌ Redis connection error:', err.message);
        console.log('⚠️ ใช้ in-memory storage แทน');
        return false;
    }
}

initRedis();

async function resolveSocketUserId(socket) {
    const auth = socket.handshake.auth || {};
    const query = socket.handshake.query || {};

    let userId = auth.userId || query.userId || null;
    const token = auth.token || query.token || null;

    if (!userId && token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            userId = decoded?.id || null;
        } catch (err) {
            console.warn('⚠️ Socket auth token invalid:', err.message);
        }
    }

    if (userId && token) {
        try {
            const user = await User.findByPk(userId);
            if (!user) {
                console.warn('⚠️ Socket user not found for userId:', userId);
                return null;
            }

            if (user.sessionToken && user.sessionToken !== token) {
                console.warn('⚠️ Socket token mismatch for userId:', userId);
                return null;
            }
        } catch (err) {
            console.warn('⚠️ Socket user validation failed:', err.message);
            return null;
        }
    }

    return userId ? String(userId) : null;
}

io.on('connection', async (socket) => {
    let userId = await resolveSocketUserId(socket);
    socket.data.userId = userId;
    console.log('🔌 User connected:', socket.id, '| userId:', userId || '[unknown]');

    // Helper functions - ใช้ได้ทั้ง Redis และ in-memory
    const getStoredSocketId = async (uid) => {
        if (redisCache && redisCache.isReady) {
            return await redisCache.hGet('userSocketMap', String(uid));
        }
        return userSocketMap.get(String(uid)) || null;
    };

    const setStoredSocketId = async (uid, sid) => {
        if (redisCache && redisCache.isReady) {
            await redisCache.hSet('userSocketMap', String(uid), sid);
        } else {
            userSocketMap.set(String(uid), sid);
        }
    };

    const delStoredSocketId = async (uid) => {
        if (redisCache && redisCache.isReady) {
            await redisCache.hDel('userSocketMap', String(uid));
        } else {
            userSocketMap.delete(String(uid));
        }
    };

    const getAllStoredUsers = async () => {
        if (redisCache && redisCache.isReady) {
            return await redisCache.hKeys('userSocketMap');
        }
        return Array.from(userSocketMap.keys());
    };

    if (userId) {
        const existingSocketId = await getStoredSocketId(userId);

        // 🌟 ถ้าเจอว่ามีเครื่องเก่าล็อกอินค้างไว้อยู่แล้ว
        if (existingSocketId && existingSocketId !== socket.id) {
            // 🚨 เตะเครื่องเก่าออก
            io.to(existingSocketId).emit("force_logout", {
                message: "บัญชีนี้ถูกเข้าสู่ระบบจากอุปกรณ์อื่น คุณจึงถูกออกจากระบบ"
            });
        }

        await setStoredSocketId(userId, socket.id);
    }

    // รองรับ event register_user เผื่อฝั่ง frontend ส่งมาแยกต่างหาก
    socket.on("register_user", async (payload) => {
        const reqUserId = payload?.userId || payload || null;
        const token = payload?.token || null;

        let newUserId = reqUserId;
        if (!newUserId && token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                newUserId = decoded?.id || null;
            } catch (err) {
                console.warn('⚠️ register_user token invalid:', err.message);
            }
        }

        if (!newUserId) {
            console.warn('⚠️ register_user missing userId or valid token for socket:', socket.id);
            return;
        }

        userId = String(newUserId);
        socket.data.userId = userId;

        const existingSocketId = await getStoredSocketId(userId);
        if (existingSocketId && existingSocketId !== socket.id) {
            io.to(existingSocketId).emit("force_logout", {
                message: "บัญชีนี้ถูกเข้าสู่ระบบจากอุปกรณ์อื่น คุณจึงถูกออกจากระบบ"
            });
        }

        await setStoredSocketId(userId, socket.id);
        const allUsers = await getAllStoredUsers();
        io.emit('getOnlineUsers', allUsers);
    });

    // ส่งรายชื่อ users ที่ออนไลน์อยู่ให้ทุกคน
    const initialUsers = await getAllStoredUsers();
    io.emit('getOnlineUsers', initialUsers);

    // ให้คนเข้าห้องแชทได้ตรงกัน
    socket.on("join_room", (roomId) => {
        socket.join(String(roomId));
        console.log(`🏠 User ${userId || socket.id} joined room: ${roomId}`);
    });

    // เมื่อ disconnect
    socket.on('disconnect', async () => {
        console.log('❌ User disconnected:', socket.id, '| userId:', userId || '[unknown]');
        
        if (userId) {
            // ตรวจสอบก่อนลบ ว่า socket.id ที่หลุดคืออันเดียวกับที่เซฟไว้ไหม
            const savedSocketId = await getStoredSocketId(userId);
            if (savedSocketId === socket.id) {
                await delStoredSocketId(userId);
            }
        }

        const updatedUsers = await getAllStoredUsers();
        io.emit('getOnlineUsers', updatedUsers);
    });
});

// ฟังก์ชันหา socketId จาก userId เป็น Async!
async function getReceiverSocketId(userId) {
    if (!userId) return null;
    
    try {
        if (redisCache && redisCache.isReady) {
            return await redisCache.hGet('userSocketMap', String(userId));
        }
        // Fallback to in-memory
        return userSocketMap.get(String(userId)) || null;
    } catch (err) {
        console.error('getReceiverSocketId error:', err.message);
        return userSocketMap.get(String(userId)) || null;
    }
}

module.exports = { io, app, server, getReceiverSocketId, redisCache };
