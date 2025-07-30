const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/messageController');
const authMiddleware = require('../middleware/auth');

// All routes in this file are protected
router.use(authMiddleware);

// Route to send a message
router.post('/', sendMessage);

module.exports = router;
