const express = require('express');
const router = express.Router();
const { analyzeEmotion } = require('../controllers/aiSearchController');

// POST: /api/v1/ai/analyze-emotion
router.post('/analyze-emotion', analyzeEmotion);

module.exports = router;
