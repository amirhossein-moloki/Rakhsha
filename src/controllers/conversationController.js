const Conversation = require('../models/Conversation');
const SecretConversation = require('../models/SecretConversation');
const Message = require('../models/Message');
const { generateKey, encrypt } = require('../utils/crypto');
const asyncHandler = require('express-async-handler');

/**
 * @description Create a new conversation
 * @route POST /api/conversations
 * @access Private
 */
exports.createConversation = asyncHandler(async (req, res) => {
    const { type, participants, name } = req.body;
    const conversation = new Conversation({
        type,
        participants,
        name
    });
    await conversation.save();
    res.status(201).send(conversation);
});

/**
 * @description Create a new secret conversation
 * @route POST /api/conversations/secret
 * @access Private
 */
exports.createSecretConversation = asyncHandler(async (req, res) => {
    const { type, participants, name } = req.body;
    const conversationKey = generateKey();

    const encrypted_participants = participants.map(p => encrypt(p, conversationKey));
    const encrypted_name = encrypt(name, conversationKey);

    const secretConversation = new SecretConversation({
        type,
        encrypted_participants,
        encrypted_name,
        conversationKey
    });

    await secretConversation.save();
    res.status(201).send(secretConversation);
});

/**
 * @description Get all conversations for a user
 * @route GET /api/conversations
 * @access Private
 */
exports.getConversations = asyncHandler(async (req, res) => {
    const conversations = await Conversation.find({ participants: req.user._id });
    res.send(conversations);
});

const SecretMessage = require('../models/SecretMessage');
const redis = require('redis');

/**
 * @description Get all messages for a conversation
 * @route GET /api/conversations/:conversationId/messages
 * @access Private
 */
exports.getMessages = asyncHandler(async (req, res) => {
    const messages = await Message.find({ conversationId: req.params.conversationId });
    res.send(messages);
});

const { decrypt } = require('../utils/crypto');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage
}).single('file');


/**
 * @description Send a file
 * @route POST /api/conversations/messages/send-file
 * @access Private
 */
exports.sendFile = (req, res, next) => {
    upload(req, res, asyncHandler(async (err) => {
        if (err) {
            return res.status(400).send({ error: 'Failed to upload file' });
        }
        if (!req.file) {
            return res.status(400).send({ error: 'No file selected' });
        }

        const { conversationId } = req.body;
        const message = new Message({
            conversationId,
            senderId: req.user._id,
            contentType: 'image', // This can be improved to handle different file types
            mediaUrl: req.file.path
        });

        await message.save();
        res.send(message);
    }));
};

/**
 * @description Get all secret messages for a conversation
 * @route GET /api/conversations/:conversationId/secret-messages
 * @access Private
 */
exports.getSecretMessages = asyncHandler(async (req, res) => {
    const client = redis.createClient();
    await client.connect();

    try {
        const isHidden = await client.get(`hidden_mode:${req.user._id}`);

        if (isHidden) {
            const conversation = await SecretConversation.findById(req.params.conversationId);
            if (conversation) {
                const messages = await SecretMessage.find({ conversationId: req.params.conversationId });
                const decryptedMessages = messages.map(msg => {
                    return {
                        ...msg.toObject(),
                        content: decrypt(msg.content, conversation.conversationKey)
                    };
                });
                res.send(decryptedMessages);
            } else {
                res.status(404).send({ error: 'Secret conversation not found' });
            }
        } else {
            res.status(403).send({ error: 'Forbidden' });
        }
    } finally {
        if (client.isOpen) {
            await client.disconnect();
        }
    }
});

/**
 * @description Edit a message
 * @route PUT /api/conversations/messages/:messageId
 * @access Private
 */
exports.editMessage = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const message = await Message.findById(req.params.messageId);

    if (!message) {
        return res.status(404).send({ error: 'Message not found' });
    }

    if (message.senderId.toString() !== req.user._id.toString()) {
        return res.status(403).send({ error: 'Forbidden' });
    }

    message.content = content;
    message.edited = true;
    await message.save();
    res.send(message);
});

/**
 * @description Delete a message
 * @route DELETE /api/conversations/messages/:messageId
 * @access Private
 */
exports.deleteMessage = asyncHandler(async (req, res) => {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
        return res.status(404).send({ error: 'Message not found' });
    }

    if (message.senderId.toString() !== req.user._id.toString()) {
        return res.status(403).send({ error: 'Forbidden' });
    }

    await message.deleteOne();
    res.send({ message: 'Message deleted' });
});
