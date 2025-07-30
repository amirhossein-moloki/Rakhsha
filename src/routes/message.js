const express = require('express');
const router = express.Router();
const { sendMessage, markMessageAsRead } = require('../controllers/messageController');
const authMiddleware = require('../middleware/auth');

// All routes in this file are protected
router.use(authMiddleware);

// Route to send a message
router.post('/', sendMessage);

// Route to mark a message as read
router.post('/:messageId/read', markMessageAsRead);

module.exports = router;
