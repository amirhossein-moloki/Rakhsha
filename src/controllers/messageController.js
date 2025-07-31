const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const asyncHandler = require('express-async-handler');
const { decryptHybrid, verify } = require('../utils/crypto');
const axios = require('axios');
const Node = require('../models/Node');
const User = require('../models/User');

/**
 * @description Send a new message
 * @route POST /api/messages
 * @access Private
 */
exports.sendMessage = asyncHandler(async (req, res) => {
    const { conversationId, recipientId, messageType, ciphertextPayload, encryptedTimestamp } = req.body;

    if (!conversationId || !recipientId || !ciphertextPayload || !encryptedTimestamp) {
        return res.status(400).send({ error: 'conversationId, recipientId, ciphertextPayload, and encryptedTimestamp are required.' });
    }

    // 1. Authorize that the sender is part of the conversation using the new model.
    if (!req.user.conversations.map(id => id.toString()).includes(conversationId)) {
        return res.status(403).send({ error: 'Forbidden: You are not a participant in this conversation.' });
    }

    // 2. Create the new message object. Note we are NOT saving the senderId.
    const messageData = {
        conversationId,
        recipientId,
        messageType,
        ciphertextPayload,
    };

    // Advanced Disappearing Messages: Set expiration if requested by the client.
    const { expiresInSeconds } = req.body;
    if (expiresInSeconds && Number.isInteger(expiresInSeconds) && expiresInSeconds > 0) {
        messageData.expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    }

    const message = new Message(messageData);

    await message.save();

    // 4. Notify the recipient via WebSocket in real-time
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

/**
 * @description Route an onion-encrypted message
 * @route POST /api/messages/route
 * @access Public
 */
exports.routeMessage = asyncHandler(async (req, res) => {
    const { onionPayload } = req.body;

    if (!onionPayload) {
        return res.status(400).send({ error: 'onionPayload is required.' });
    }

    try {
        const decryptedPayload = decryptHybrid(onionPayload, process.env.SERVER_PRIVATE_KEY);
        const { nextNodeAddress, remainingPayload } = JSON.parse(decryptedPayload);

        if (nextNodeAddress === 'self' || nextNodeAddress === process.env.SERVER_ADDRESS) {
            // This server is the final destination.
            // The remainingPayload is a JSON string containing the signed message data.
            const { signedMessage, senderIdentityKey } = JSON.parse(remainingPayload);
            const { messageData, signature } = JSON.parse(signedMessage);

            // 1. Verify the signature. The sender signs the message data with their private identity key.
            const isVerified = verify(JSON.stringify(messageData), signature, senderIdentityKey);

            if (!isVerified) {
                return res.status(401).send({ error: 'Invalid signature.' });
            }

            // 2. The sender must be a valid user in the system.
            // We find the user by their public identity key.
            const sender = await User.findOne({ identityKey: senderIdentityKey });
            if (!sender) {
                return res.status(403).send({ error: 'Forbidden. Sender is not a registered user.' });
            }

            // 3. The sender must be a participant in the conversation.
            // This is the crucial authorization step.
            if (!sender.conversations.map(id => id.toString()).includes(messageData.conversationId)) {
                return res.status(403).send({ error: 'Forbidden: Sender is not a participant in this conversation.' });
            }

            // 4. If signature and authorization are valid, create and save the message.
            // We are still preserving the "Sealed Sender" principle by NOT storing senderId.
            const message = new Message(messageData);
            await message.save();

            // 5. Notify the recipient via WebSocket in real-time.
            const io = req.app.get('socketio');
            if (io) {
                io.to(messageData.conversationId).emit('receive_message', message);
            }

            res.status(200).send({ message: 'Message delivered.' });

        } else {
            // Forward the message to the next node in the mixnet.
            await axios.post(`${nextNodeAddress}/api/messages/route`, {
                onionPayload: remainingPayload
            });
            res.status(200).send({ message: 'Message forwarded.' });
        }
    } catch (error) {
        console.error('Failed to route message:', error);
        res.status(500).send({ error: 'Failed to process onion payload.' });
    }
});
