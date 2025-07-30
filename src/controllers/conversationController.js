const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

/**
 * @description Create a new conversation
 * @route POST /api/conversations
 * @access Private
 */
exports.createConversation = asyncHandler(async (req, res) => {
    const { type, name, participants, participantIds, encryptedCreatedAt, conversationKey } = req.body;

    if (!encryptedCreatedAt) {
        return res.status(400).send({ error: 'encryptedCreatedAt is required.' });
    }

    // Add the creator to the participants list if not already there
    if (!participantIds.includes(req.user._id.toString())) {
        participantIds.push(req.user._id.toString());
    }

    const conversation = new Conversation({
        type,
        name, // Opaque data from client
        participants, // Opaque data from client
        participantIds, // Plaintext IDs for server logic
        createdAt: encryptedCreatedAt,
        lastMessageAt: encryptedCreatedAt, // Initially, last message time is creation time
        conversationKey, // Encrypted conversation key
    });
    await conversation.save();

    // Add conversation to each participant's user object
    await User.updateMany(
        { _id: { $in: participantIds } },
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
    // req.auth is populated by the auth middleware with the token payload
    const userId = req.auth.userId;
    const inSecretMode = req.auth.secretMode === true;

    // Build the query to find conversations where the user is a participant
    // and the hidden status matches their current mode.
    const query = {
        participantIds: userId,
        isHidden: inSecretMode
    };

    const conversations = await Conversation.find(query);

    // The client is responsible for sorting, as lastMessageAt is encrypted.
    res.send(conversations);
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

    // Authorize: Check if the user is a participant of the conversation
    if (!conversation.participantIds.map(id => id.toString()).includes(req.user._id.toString())) {
        return res.status(403).send({ error: 'Forbidden: You are not a participant of this conversation.' });
    }

    const messages = await Message.find({ conversationId });
    res.send(messages); // Send raw message objects; client will decrypt
});

// Helper function to avoid code duplication for hiding/unhiding
const updateHiddenState = async (conversationId, userId, isHidden) => {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        throw { statusCode: 404, message: 'Conversation not found' };
    }

    // Authorize: Check if the user is a participant
    if (!conversation.participantIds.map(id => id.toString()).includes(userId.toString())) {
        throw { statusCode: 403, message: 'Forbidden: You are not a participant of this conversation.' };
    }

    conversation.isHidden = isHidden;
    await conversation.save();
    return conversation;
};

/**
 * @description Hide a conversation
 * @route POST /api/conversations/:conversationId/hide
 * @access Private
 */
exports.hideConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.auth.userId; // Use req.auth from middleware

    await updateHiddenState(conversationId, userId, true);
    res.status(200).send({ message: 'Conversation hidden successfully.' });
});

/**
 * @description Unhide a conversation
 * @route POST /api/conversations/:conversationId/unhide
 * @access Private
 */
exports.unhideConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.auth.userId; // Use req.auth from middleware

    await updateHiddenState(conversationId, userId, false);
    res.status(200).send({ message: 'Conversation unhidden successfully.' });
});
