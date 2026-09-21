const express = require('express');
const router = express.Router();
const { register, login, getMe, registerAdmin, registerOwner, logout, verifyEmail, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// UC1: สมัครสมาชิก (ส่งอีเมลยืนยัน)
router.post('/register', register);

// ยืนยันอีเมล
router.get('/verify-email/:token', verifyEmail);

// ลืมรหัสผ่าน - ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมล
router.post('/forgot-password', forgotPassword);

// ตั้งรหัสผ่านใหม่จากลิงก์
router.post('/reset-password/:token', resetPassword);

// UC2: เข้าสู่ระบบ
router.post('/login', login);

// ดึงข้อมูลผู้ใช้ปัจจุบัน
router.get('/me', protect, getMe);

// สร้าง Admin (สำหรับ Postman - ไม่ต้อง login)
router.post('/register-admin', registerAdmin);
router.post('/register-owner', registerOwner);

// ออกจากระบบ
router.post('/logout', protect, logout);

module.exports = router;
