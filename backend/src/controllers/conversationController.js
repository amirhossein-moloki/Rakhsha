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
    // The client now sends an encrypted metadata blob and, for one-time use,
    // the plaintext list of participant IDs.
    const { type, encryptedMetadata, participantIds, encryptedCreatedAt, conversationKey } = req.body;

    if (!encryptedMetadata || !participantIds || !encryptedCreatedAt) {
        return res.status(400).send({ error: 'encryptedMetadata, participantIds, and encryptedCreatedAt are required.' });
    }

    // Ensure the creator is in the participant list for atomicity.
    if (!participantIds.includes(req.user._id.toString())) {
        participantIds.push(req.user._id.toString());
    }

    const conversation = new Conversation({
        type,
        encryptedMetadata, // The server stores this opaque blob.
        createdAt: encryptedCreatedAt,
        lastMessageAt: encryptedCreatedAt,
        conversationKey,
    });
    await conversation.save();

    // The server uses the plaintext participantIds to add the new conversation's
    // ID to each user's document. The plaintext list is then discarded.
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
    const inSecretMode = req.auth.secretMode === true;

    // The user object (from the auth middleware) now holds the list of conversation IDs.
    // We no longer query by participantIds in the Conversation collection.
    const user = await User.findById(req.auth.userId).select('conversations');
    if (!user) {
        return res.status(404).send({ error: 'User not found.' });
    }

    const query = {
        _id: { $in: user.conversations },
        isHidden: inSecretMode
    };

    const conversations = await Conversation.find(query);

    res.send(conversations);
});

/**
 * @description Get all messages for a conversation
 * @route GET /api/conversations/:conversationId/messages
 * @access Private
 */
exports.getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const user = req.user; // User object from auth middleware

    // Authorize: Check if the conversationId exists in the user's own list of conversations.
    // This is the new authorization model that doesn't require the server to read participant lists.
    if (!user.conversations.map(id => id.toString()).includes(conversationId)) {
        return res.status(403).send({ error: 'Forbidden: You are not a participant of this conversation.' });
    }

    // We can proceed, knowing the user is authorized for this conversation.
    const messages = await Message.find({ conversationId });
    res.send(messages); // Send raw message objects; client will decrypt
});

// Helper function to avoid code duplication for hiding/unhiding
const updateHiddenState = async (conversationId, user, isHidden) => {
    // Authorize: Check if the conversationId exists in the user's own list of conversations.
    if (!user.conversations.map(id => id.toString()).includes(conversationId)) {
        throw { statusCode: 403, message: 'Forbidden: You are not a participant of this conversation.' };
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        throw { statusCode: 404, message: 'Conversation not found' };
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
    // The helper function now requires the full user object for authorization.
    await updateHiddenState(conversationId, req.user, true);
    res.status(200).send({ message: 'Conversation hidden successfully.' });
});

/**
 * @description Unhide a conversation
 * @route POST /api/conversations/:conversationId/unhide
 * @access Private
 */
exports.unhideConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    // The helper function now requires the full user object for authorization.
    await updateHiddenState(conversationId, req.user, false);
    res.status(200).send({ message: 'Conversation unhidden successfully.' });
});

/**
 * @description Edit a message
 * @route PUT /api/conversations/messages/:messageId
 * @access Private
 */
exports.editMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
        return res.status(404).send({ error: 'Message not found.' });
    }

    // In the E2EE model, the server can't know the original sender.
    // The authorization to edit should be based on participation in the conversation.
    const conversation = await Conversation.findOne({ _id: message.conversationId });
    if (!conversation) {
        return res.status(404).send({ error: 'Conversation not found.' });
    }

    // The auth check relies on the user object populated by the auth middleware
    if (!req.user.conversations.map(id => id.toString()).includes(message.conversationId.toString())) {
        return res.status(403).send({ error: 'Forbidden: You are not a participant of this conversation.' });
    }

    message.ciphertextPayload = content; // The client sends the new encrypted content
    message.edited = true;
    await message.save();

    // Broadcast the edited message via WebSocket
    const io = req.app.get('socketio');
    io.to(message.conversationId.toString()).emit('message_edited', message);

    res.status(200).send(message);
});

/**
 * @description Delete a message
 * @route DELETE /api/conversations/messages/:messageId
 * @access Private
 */
exports.deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
        return res.status(404).send({ error: 'Message not found.' });
    }

    // Authorization check: User must be a participant in the conversation.
    if (!req.user.conversations.map(id => id.toString()).includes(message.conversationId.toString())) {
        return res.status(403).send({ error: 'Forbidden: You are not a participant of this conversation.' });
    }

    const conversationId = message.conversationId.toString();
    await message.deleteOne();

    // Broadcast the deleted message ID via WebSocket
    const io = req.app.get('socketio');
    io.to(conversationId).emit('message_deleted', { messageId, conversationId });

    res.status(200).send({ message: 'Message deleted successfully.' });
});
