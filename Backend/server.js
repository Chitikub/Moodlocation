// ทดสอบ merge

const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { connectDB } = require("./config/db");
const { sequelize } = require("./models");

// Import Socket.IO (สร้าง app + server พร้อม WebSocket)
const { app, server } = require("./lib/socket");

// Import Routes
const authRoutes = require("./routes/authRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const historyRoutes = require("./routes/historyRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const chatRoomRoutes = require("./routes/chatRoomRoutes");
const aiSearchRoutes = require("./routes/aiSearchRoutes");
const mapsRoutes = require("./routes/mapsRoutes");
const announcementRoutes = require("./routes/announcementRoutes");

// CORS Configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173", "https://moodlocation.vercel.app"];

app.use(
  cors({
    origin: function (origin, callback) {
      // อนุญาต requests ที่ไม่มี origin (เช่น Postman, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.error("CORS Error: Origin not allowed:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (สำหรับรูปภาพที่ upload)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ========== Routes (v1) ==========
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/favorites", favoriteRoutes);
app.use("/api/v1/history", historyRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/contact", chatRoomRoutes);
app.use("/api/v1/ai", aiSearchRoutes);
app.use("/api/v1/maps", mapsRoutes);
app.use("/api/v1/announcements", announcementRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "🎭 เซิฟเวอณ์ของหลังบ้านทำงานแล้ว!",
    // version: '1.0.0',
    // endpoints: {
    //     auth: '/api/v1/auth',
    //     places: '/api/v1/places',
    //     reviews: '/api/v1/reviews',
    //     favorites: '/api/v1/favorites',
    //     history: '/api/v1/history',
    //     users: '/api/v1/users',
    //     admin: '/api/v1/admin',
    //     messages: '/api/v1/messages (WebSocket: Socket.IO)',
    //     ai: '/api/v1/ai'
    // }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  // Multer file size error
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message: "ไฟล์รูปต้องไม่เกิน 2MB",
      detail: `ไฟล์ของคุณมีขนาดเกินกำหนด กรุณาลองย่อรูปก่อน`,
    });
  }

  // Multer file filter error
  if (err.message && err.message.includes("อนุญาตเฉพาะไฟล์รูปภาพ")) {
    return res.status(400).json({ message: err.message });
  }

  res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "ไม่พบ API endpoint ที่ร้องขอ" });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    // แก้ปัญหา Foreign Key: ลบ constraint เดิมของ favorites และ histories ทิ้งก่อน
    try {
      await sequelize.query(
        'ALTER TABLE "favorites" DROP CONSTRAINT IF EXISTS "favorites_placeId_fkey" CASCADE;',
      );
      await sequelize.query(
        'ALTER TABLE "histories" DROP CONSTRAINT IF EXISTS "histories_placeId_fkey" CASCADE;',
      );
    } catch (e) {
      console.log("Constraint might not exist or already dropped");
    }

    // Sync database (สร้าง tables อัตโนมัติ)
    await sequelize.sync({ alter: true });
    console.log("✅ Database synced successfully");

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 http://localhost:${PORT}`);
      console.log(`📡 API: bound to 0.0.0.0:${PORT}`);
      console.log(`💬 Socket.IO: WebSocket ready for chat`);
    });
  } catch (error) {
    console.error("❌ ไม่สามรถเชื่อมต่อฐานข้อมูล PostgreSQL:", error);
    process.exit(1);
  }
};

startServer();
