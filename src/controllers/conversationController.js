const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { generateSymmetricKey, encryptSymmetric, decryptSymmetric } = require('../utils/crypto');
const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');

/**
 * @description Create a new conversation
 * @route POST /api/conversations
 * @access Private
 */
exports.createConversation = asyncHandler(async (req, res) => {
    const { type, participants, name } = req.body;
    const conversationKey = generateSymmetricKey();

    // Add the creator to the participants list
    if (!participants.includes(req.user._id.toString())) {
        participants.push(req.user._id.toString());
    }

    const encrypted_name = encryptSymmetric(name, conversationKey);
    const encrypted_participants = participants.map(p => encryptSymmetric(p, conversationKey));

    const conversation = new Conversation({
        type,
        encrypted_name,
        encrypted_participants,
        conversationKey
    });
    await conversation.save();

    // Add conversation to each participant's user object
    await User.updateMany(
        { _id: { $in: participants } },
        { $push: { conversations: conversation._id } }
    );

    res.status(201).send(conversation);
});

/**
 * @description Get all conversations for a user
 * @route GET /api/conversations
 * @access Private
 */
exports.getConversations = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate('conversations');
    const decryptedConversations = user.conversations.map(convo => {
        const decrypted_name = decryptSymmetric(convo.encrypted_name, convo.conversationKey);
        const decrypted_participants = convo.encrypted_participants.map(p => decryptSymmetric(p, convo.conversationKey));
        return {
            _id: convo._id,
            type: convo.type,
            name: decrypted_name,
            participants: decrypted_participants,
            createdAt: convo.createdAt,
            lastMessageAt: convo.lastMessageAt
        };
    });
    res.send(decryptedConversations);
});

/**
 * @description Get all messages for a conversation
 * @route GET /api/conversations/:conversationId/messages
 * @access Private
 */
exports.getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        return res.status(404).send({ error: 'Conversation not found' });
    }

    // Check if the user is a participant of the conversation
    const decrypted_participants = conversation.encrypted_participants.map(p => decryptSymmetric(p, conversation.conversationKey));
    if (!decrypted_participants.includes(req.user._id.toString())) {
        return res.status(403).send({ error: 'Forbidden' });
    }

    const messages = await Message.find({ conversationId });
    const decryptedMessages = messages.map(msg => {
        const decrypted_content = msg.encrypted_content ? decryptSymmetric(msg.encrypted_content, conversation.conversationKey) : '';
        const decrypted_mediaUrl = msg.encrypted_mediaUrl ? decryptSymmetric(msg.encrypted_mediaUrl, conversation.conversationKey) : '';
        return {
            ...msg.toObject(),
            content: decrypted_content,
            mediaUrl: decrypted_mediaUrl,
            encrypted_content: undefined,
            encrypted_mediaUrl: undefined
        };
    });
    res.send(decryptedMessages);
});

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).single('file');


/**
 * @description Send a file
 * @route POST /api/conversations/messages/send-file
 * @access Private
 */
exports.sendFile = (req, res, next) => {
    upload(req, res, asyncHandler(async (err) => {
        if (err) {
            if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).send({ error: 'File size limit exceeded. Max size is 10MB.' });
            }
            return res.status(400).send({ error: 'Failed to upload file' });
        }
        if (!req.file) {
            return res.status(400).send({ error: 'No file selected' });
        }

        const { conversationId } = req.body;
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).send({ error: 'Conversation not found' });
        }

        const encrypted_mediaUrl = encryptSymmetric(req.file.path, conversation.conversationKey);

        const message = new Message({
            conversationId,
            senderId: req.user._id,
            contentType: req.file.mimetype, // Use the file's MIME type
            encrypted_mediaUrl
        });

        await message.save();
        res.send(message);
    }));
};

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

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
        return res.status(404).send({ error: 'Conversation not found' });
    }

    message.encrypted_content = encryptSymmetric(content, conversation.conversationKey);
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
