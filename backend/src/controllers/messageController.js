const Message = require('../models/Message');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

/**
 * @description Send a new message
 * @route POST /api/messages
 * @access Private
 */
exports.sendMessage = asyncHandler(async (req, res) => {
    const { conversationId, messages, messageType } = req.body;

    if (!conversationId || !Array.isArray(messages) || !messages.length) {
        return res.status(400).send({ error: 'conversationId and a non-empty messages array are required.' });
    }

    // 1. Authorize that the sender is part of the conversation.
    if (!req.user.conversations.map(id => id.toString()).includes(conversationId)) {
        return res.status(403).send({ error: 'Forbidden: You are not a participant in this conversation.' });
    }

    const createdMessages = [];

    for (const msg of messages) {
        const { recipientId, ciphertextPayload, encryptedTimestamp } = msg;

        if (!recipientId || !ciphertextPayload) {
            // We can choose to either fail the whole batch or skip invalid messages.
            // For now, let's skip and log an error. A more robust implementation might return partial success.
            console.error('Skipping invalid message in batch:', msg);
            continue;
        }

        // 2. Create the new message object.
        const messageData = {
            conversationId,
            recipientId,
            messageType,
            ciphertextPayload,
        };

        // Optional: Handle disappearing messages if expiresInSeconds is provided at the top level.
        const { expiresInSeconds } = req.body;
        if (expiresInSeconds && Number.isInteger(expiresInSeconds) && expiresInSeconds > 0) {
            messageData.expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
        }

        const message = new Message(messageData);
        await message.save();
        createdMessages.push(message);

        // 4. Notify the recipient via WebSocket in real-time
        const io = req.app.get('socketio');
        if (io) {
            io.to(conversationId).emit('receive_message', {
                ...message.toObject(),
                senderIdentityKey: req.user.identityKey,
                registrationId: req.user.registrationId
            });
        }
    }

    res.status(201).send(createdMessages);
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
    // We use the new authorization model to verify this.
    if (!req.user.conversations.map(id => id.toString()).includes(message.conversationId.toString())) {
        return res.status(403).send({ error: 'Forbidden: You are not a participant in this conversation.' });
    }

    // Check if the user has read receipts enabled.
    const user = req.user; // We should already have the user object from the auth middleware.
    if (user && user.settings && user.settings.readReceiptsEnabled) {
        // Add the user to the 'readBy' array if they are not already in it.
        const updatedMessageResult = await Message.updateOne(
            { _id: messageId },
            { $addToSet: { readBy: userId } }
        );

        // If the update resulted in a change, notify the room.
        if (updatedMessageResult.modifiedCount > 0) {
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
    }

    // Send a success response regardless of whether it was already read or not.
    res.status(200).send({ message: 'Message marked as read.' });
});