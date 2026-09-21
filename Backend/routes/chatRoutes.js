const express = require('express');
const router = express.Router();
const {
    getUsersForSidebar,
    getMessages,
    sendMessage,
    markMessagesAsRead
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.get("/users", protect, getUsersForSidebar);
router.get("/:id", protect, getMessages);

router.post("/send/:id", protect, sendMessage);
router.put("/mark-read/:id", protect, markMessagesAsRead);

module.exports = router;
