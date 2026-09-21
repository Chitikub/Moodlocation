const express = require('express');
const router = express.Router();
const { updateProfile, changePassword } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ทุก route ต้อง login
router.use(protect);

// UC10: แก้ไขโปรไฟล์ (รองรับ upload รูป)
router.put('/profile', upload.single('profileImage'), updateProfile);

// เปลี่ยนรหัสผ่าน
router.put('/change-password', changePassword);

module.exports = router;
