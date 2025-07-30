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

    // 5. Notify the recipient via WebSocket in real-time
    const io = req.app.get('socketio');
    if (io) {
        // The client-side should be listening for the 'receive_message' event
        // in the specific conversation room.
        io.to(conversationId).emit('receive_message', message);
    }

    res.status(201).send(message);
});

/**
 * @description Mark a message as read
 * @route POST /api/messages/:messageId/read
 * @access Private
 */
exports.markMessageAsRead = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
        return res.status(404).send({ error: 'Message not found.' });
    }

    // To mark a message as read, the user must be a participant in the conversation.
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !conversation.participantIds.map(id => id.toString()).includes(userId.toString())) {
        return res.status(403).send({ error: 'Forbidden: You are not a participant in this conversation.' });
    }

    // Add the user to the 'readBy' array if they are not already in it.
    const updatedMessageResult = await Message.updateOne(
        { _id: messageId },
        { $addToSet: { readBy: userId } }
    );

    // If the update resulted in a change, notify the room.
    if (updatedMessageResult.nModified > 0) {
        const io = req.app.get('socketio');
        if (io) {
            io.to(message.conversationId.toString()).emit('message_read', {
                messageId: message._id,
                conversationId: message.conversationId,
                readerId: userId,
                readAt: new Date()
            });
        }
    }

    // Send a success response regardless of whether it was already read or not.
    res.status(200).send({ message: 'Message marked as read.' });
});
