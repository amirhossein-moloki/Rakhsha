const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, conversationController.createConversation);
router.get('/', authMiddleware, conversationController.getConversations);
router.get('/:conversationId/messages', authMiddleware, conversationController.getMessages);
router.put('/messages/:messageId', authMiddleware, conversationController.editMessage);
router.delete('/messages/:messageId', authMiddleware, conversationController.deleteMessage);

// Routes to hide and unhide conversations
router.post('/:conversationId/hide', authMiddleware, conversationController.hideConversation);
router.post('/:conversationId/unhide', authMiddleware, conversationController.unhideConversation);

module.exports = router;
