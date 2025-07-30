const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, conversationController.createConversation);
router.get('/', authMiddleware, conversationController.getConversations);
router.get('/:conversationId/messages', authMiddleware, conversationController.getMessages);

module.exports = router;
