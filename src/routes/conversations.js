const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const authMiddleware = require('../middleware/auth');
const proxyMiddleware = require('../middleware/proxy');

// Apply auth and proxy middleware to all conversation routes
router.use(authMiddleware);
router.use(proxyMiddleware);

router.post('/', conversationController.createConversation);
router.get('/', conversationController.getConversations);
router.get('/:conversationId/messages', conversationController.getMessages);
router.put('/messages/:messageId', conversationController.editMessage);
router.delete('/messages/:messageId', conversationController.deleteMessage);
router.post('/messages/send-file', conversationController.sendFile);
router.post('/:conversationId/join', conversationController.joinConversation);

module.exports = router;
