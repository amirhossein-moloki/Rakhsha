const Conversation = require('../models/Conversation');
const Session = require('../models/Session');
const Message = require('../models/Message');
const User = require('../models/User');
const { generateSymmetricKey, encryptSymmetric, decryptSymmetric, computeSharedSecret } = require('../utils/crypto');
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

    // Add the creator to the participants list
    if (!participants.includes(req.user._id.toString())) {
        participants.push(req.user._id.toString());
    }

    // TODO: The name should be encrypted for each participant with their public key.
    // For now, using a temporary key.
    const tempKey = generateSymmetricKey();
    const encrypted_name = encryptSymmetric(name, tempKey);

    const conversation = new Conversation({
        type,
        participants: participants, // Storing participant IDs in plaintext for now.
        encrypted_name,
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
 * @description Establish a secure session in a conversation
 * @route POST /api/conversations/:conversationId/join
 * @access Private
 */
exports.joinConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { ecdhPublicKey, clientPrivateKey } = req.body; // In a real app, the client NEVER sends its private key.
                                                        // This is a simulation for the backend to compute the key.
    const userId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        return res.status(404).send({ error: 'Conversation not found' });
    }

    // This is a simplified example for a two-person conversation.
    const otherParticipantId = conversation.participants.find(p => p.toString() !== userId.toString());

    if (!otherParticipantId) {
        return res.status(400).send({ error: 'Could not find the other participant.' });
    }

    const otherUser = await User.findById(otherParticipantId);
    if (!otherUser || !otherUser.ecdhPublicKey) {
        return res.status(400).send({ error: 'Other user is not available for key exchange.' });
    }

    // The server computes the shared secret. In a real E2EE app, this would happen on the client.
    const sessionKey = computeSharedSecret(clientPrivateKey, otherUser.ecdhPublicKey);

    // Store the new session key, replacing any old one.
    await Session.findOneAndUpdate(
        { conversationId, userId },
        { sessionKey },
        { upsert: true, new: true }
    );

    // The client also needs the other user's public key to compute the same secret.
    res.status(200).send({
        message: 'Session established',
        otherUserPublicKey: otherUser.ecdhPublicKey
    });
});

/**
 * @description Get all conversations for a user
 * @route GET /api/conversations
 * @access Private
 */
exports.getConversations = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate('conversations');

    // NOTE: Decrypting the name requires a key. Since we deprecated the shared
    // conversationKey, we can't easily decrypt this here. This is a limitation
    // of the current simplified design. In a full app, the name would be
    // encrypted for each user with their public key.
    const conversations = user.conversations.map(convo => ({
        ...convo.toObject(),
        name: "[Encrypted Name]" // Placeholder
    }));
    res.send(conversations);
});

/**
 * @description Get all messages for a conversation
 * @route GET /api/conversations/:conversationId/messages
 * @access Private
 */
exports.getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const session = await Session.findOne({ conversationId, userId });
    if (!session) {
        return res.status(403).send({ error: 'No active session. Please join the conversation to establish a key.' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        return res.status(404).send({ error: 'Conversation not found' });
    }
    if (!conversation.participants.includes(userId)) {
        return res.status(403).send({ error: 'Forbidden' });
    }

    const messages = await Message.find({ conversationId });
    const decryptedMessages = messages.map(msg => {
        const decrypted_content = msg.encrypted_content ? decryptSymmetric(msg.encrypted_content, session.sessionKey) : '';
        const decrypted_mediaUrl = msg.encrypted_mediaUrl ? decryptSymmetric(msg.encrypted_mediaUrl, session.sessionKey) : '';
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

        const { conversationId, recipientId, encryptedSenderId } = req.body;
        const userId = req.user._id;

        const session = await Session.findOne({ conversationId, userId });
        if (!session) {
            return res.status(403).send({ error: 'No active session for sending messages.' });
        }

        const encrypted_mediaUrl = encryptSymmetric(req.file.path, session.sessionKey);

        const message = new Message({
            conversationId,
            recipientId,
            encryptedSenderId,
            contentType: req.file.mimetype,
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

    // See comment in server.js: Authorization is tricky with sealed sender.
    // We are trusting the client to only send valid requests for now.
    // A signature-based approach would be needed for a secure implementation.

    const session = await Session.findOne({ conversationId: message.conversationId, userId: req.user._id });
    if (!session) {
        return res.status(403).send({ error: 'No active session for editing messages.' });
    }

    message.encrypted_content = encryptSymmetric(content, session.sessionKey);
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

    // See comment in server.js: Authorization is tricky with sealed sender.
    // We are trusting the client to only send valid requests for now.

    await message.deleteOne();
    res.send({ message: 'Message deleted' });
});
