const express = require('express');
const router = express.Router();
const {
    createOrGetContactRoom,
    getAllContactRooms,
    getRoomMessages,
    sendMessageToRoom,
    closeRoom,
    updateRoomStatus,
    deleteRoom
} = require('../controllers/chatRoomController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// === สำหรับ User ===
// กดติดต่อเพื่อสร้างหรือดึงห้องแชต
router.post('/', protect, createOrGetContactRoom);
// ดึงข้อความในห้องแชต
router.get('/:roomId/messages', protect, getRoomMessages);
// ส่งข้อความในห้องแชต
router.post('/:roomId/send', protect, sendMessageToRoom);

// === สำหรับ Admin ===
// ดึงห้องติดต่อทั้งหมด
router.get('/admin/all', protect, adminOnly, getAllContactRooms);
// ปิดเคสการติดต่อ
router.put('/admin/:roomId/close', protect, adminOnly, closeRoom);
// อัปเดตสถานะการติดต่อ (เปิด/ปิด)
router.put('/admin/:roomId/status', protect, adminOnly, updateRoomStatus);
// ลบห้องแชต
router.delete('/admin/:roomId', protect, adminOnly, deleteRoom);

module.exports = router;
