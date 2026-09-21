const express = require('express');
const router = express.Router();
const { getHistories, createHistory, deleteHistory } = require('../controllers/historyController');
const { protect } = require('../middleware/authMiddleware');

// ทุก route ต้อง login
router.use(protect);

// UC9: ดูประวัติการเดินทาง
router.get('/', getHistories);

// บันทึกประวัติ (เช็คอิน)
router.post('/', createHistory);

// ลบประวัติ
router.delete('/:id', deleteHistory);

module.exports = router;
