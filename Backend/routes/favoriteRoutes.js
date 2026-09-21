const express = require('express');
const router = express.Router();
const { toggleFavorite, getFavorites, checkFavorite } = require('../controllers/favoriteController');
const { protect } = require('../middleware/authMiddleware');

// ทุก route ต้อง login
router.use(protect);

// UC8: Toggle รายการโปรด
router.post('/toggle', toggleFavorite);

// ดึงรายการโปรด
router.get('/', getFavorites);

// ตรวจสอบว่าเป็นรายการโปรดหรือไม่
router.get('/check/:placeId', checkFavorite);

module.exports = router;
