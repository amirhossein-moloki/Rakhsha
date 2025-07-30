const express = require('express');
const router = express.Router();
const { sendMessage, markMessageAsRead, routeMessage } = require('../controllers/messageController');
const authMiddleware = require('../middleware/auth');

// This route is for receiving onion-encrypted messages and does not require user auth.
// The authenticity is handled by the onion encryption itself.
router.post('/route', routeMessage);

// All other routes in this file are protected
router.use(authMiddleware);

// Route to send a message (this will be deprecated in favor of /route)
router.post('/', sendMessage);

// Route to mark a message as read
router.post('/:messageId/read', markMessageAsRead);

module.exports = router;
