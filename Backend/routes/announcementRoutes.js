const express = require('express');
const router = express.Router();
const {
    getAnnouncements,
    getAnnouncementById,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
} = require('../controllers/announcementController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public route: ดึงข้อมูลประกาศ
router.get('/', getAnnouncements);
router.get('/:id', getAnnouncementById);

// Admin route: สร้าง, แก้ไข, ลบ ประกาศ
router.post('/', protect, adminOnly, createAnnouncement);
router.put('/:id', protect, adminOnly, updateAnnouncement);
router.delete('/:id', protect, adminOnly, deleteAnnouncement);

module.exports = router;
