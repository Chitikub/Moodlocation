const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    banUser,
    unbanUser,
    suspendUser,
    deleteUser
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const upload = require('../middleware/uploadMiddleware');

// ทุก route ต้อง login + เป็น admin
router.use(protect, adminOnly);


// ========== UC13: จัดการ User ==========
router.get('/users', getAllUsers);
router.put('/users/:id/ban', banUser);
router.put('/users/:id/unban', unbanUser);
router.put('/users/:id/suspend', suspendUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
