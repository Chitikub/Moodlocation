const express = require('express');
const router = express.Router();
const {
    getPlacesByMood,
    searchByMoodText,
    getPlacesByCategory,
    getAllPlaces,
    getPlaceById,
    getAllMoods
} = require('../controllers/placeController');

// ดึง Moods ทั้งหมด (ต้องอยู่ก่อน /:id)
router.get('/moods/list', getAllMoods);

// กดเลือกความรู้สึก
router.get('/mood/:mood', getPlacesByMood);

// พิมพ์ค้นหาความรู้สึก
router.get('/search', searchByMoodText);

// เลือกหมวดหมู่
router.get('/category/:category', getPlacesByCategory);

// ดึงสถานที่ทั้งหมด
router.get('/', getAllPlaces);

// ดึงสถานที่ตาม ID
router.get('/:id', getPlaceById);

module.exports = router;
