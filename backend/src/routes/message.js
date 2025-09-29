const express = require('express');
const router = express.Router();
const { sendMessage, markMessageAsRead, routeMessage } = require('../controllers/messageController');
const authMiddleware = require('../middleware/auth');
const { strictApiLimiter } = require('../middleware/rateLimiter');

// This route is for receiving onion-encrypted messages and does not require user auth.
// The authenticity is handled by the onion encryption itself.
// Apply a stricter rate limit to this public-facing, potentially intensive endpoint.
router.post('/route', strictApiLimiter, routeMessage);

// All other routes in this file are protected
router.use(authMiddleware);

// Apply rate limiting to the message sending endpoint
router.post('/', strictApiLimiter, sendMessage);

// Route to mark a message as read
router.post('/:messageId/read', markMessageAsRead);

module.exports = router;
