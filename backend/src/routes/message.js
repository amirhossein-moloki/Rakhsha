const express = require('express');
const router = express.Router();
// routeMessage has been removed as it's part of a legacy system.
const { sendMessage, markMessageAsRead } = require('../controllers/messageController');
const authMiddleware = require('../middleware/auth');
const { strictApiLimiter } = require('../middleware/rateLimiter');

// All routes in this file are protected, so we apply the auth middleware at the top level.
router.use(authMiddleware);

// Apply a strict rate limit to the message sending endpoint.
router.post('/', strictApiLimiter, sendMessage);

// Route to mark a message as read.
router.post('/:messageId/read', markMessageAsRead);

module.exports = router;