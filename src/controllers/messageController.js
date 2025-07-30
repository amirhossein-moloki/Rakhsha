const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const asyncHandler =require('express-async-handler');

/**
 * @description Send a new message
 * @route POST /api/messages
 * @access Private
 */
exports.sendMessage = asyncHandler(async (req, res) => {
    const { conversationId, recipientId, messageType, ciphertextPayload } = req.body;

    if (!conversationId || !recipientId || !ciphertextPayload) {
        return res.status(400).send({ error: 'conversationId, recipientId, and ciphertextPayload are required.' });
    }

    // 1. Find the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        return res.status(404).send({ error: 'Conversation not found.' });
    }

    // 2. Authorize that the sender is part of the conversation
    if (!conversation.participantIds.map(id => id.toString()).includes(req.user._id.toString())) {
        return res.status(403).send({ error: 'Forbidden: You are not a participant in this conversation.' });
    }

    // 3. Create the new message. Note we are NOT saving the senderId.
    const message = new Message({
        conversationId,
        // senderId is intentionally omitted for Sealed Sender.
        recipientId,
        messageType,
        ciphertextPayload
    });

    await message.save();

    // 4. Update the conversation's lastMessageAt timestamp
    conversation.lastMessageAt = message.timestamp;
    await conversation.save();

    // TODO: Notify the recipient via WebSocket

    res.status(201).send(message);
});
