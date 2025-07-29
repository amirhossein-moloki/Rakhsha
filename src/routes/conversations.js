const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const authMiddleware = require('../middleware/auth');

router.post('/', authMiddleware, conversationController.createConversation);
router.post('/secret', authMiddleware, conversationController.createSecretConversation);
router.get('/', authMiddleware, conversationController.getConversations);
router.get('/:conversationId/messages', authMiddleware, conversationController.getMessages);
router.get('/:conversationId/secret-messages', authMiddleware, conversationController.getSecretMessages);
router.put('/messages/:messageId', authMiddleware, conversationController.editMessage);
router.delete('/messages/:messageId', authMiddleware, conversationController.deleteMessage);
router.post('/messages/send-file', authMiddleware, conversationController.sendFile);

module.exports = router;
