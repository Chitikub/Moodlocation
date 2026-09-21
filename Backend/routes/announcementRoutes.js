const express = require('express');
const router = express.Router();
const {
    getAnnouncements,
    getAnnouncementById,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
} = require('../controllers/announcementController');

// Public route: ดึงข้อมูลประกาศ
router.get('/', getAnnouncements);
router.get('/:id', getAnnouncementById);

// Admin route: สร้าง, แก้ไข, ลบ ประกาศ
router.post('/', createAnnouncement);
router.put('/:id', updateAnnouncement);
router.delete('/:id', deleteAnnouncement);

module.exports = router;
