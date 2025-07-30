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
    const user = await User.findById(req.user._id).populate('conversations');
    // Sorting by 'lastMessageAt' is no longer possible on the server,
    // as the field is encrypted. The client is now responsible for sorting.
    res.send(user.conversations);
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
