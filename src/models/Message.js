const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    senderId: { // For Sealed Sender, this is optional. The sender is in the ciphertext.
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    recipientId: { // The recipient of this specific message
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    messageType: { // e.g., 'prekey' for the first message, 'normal' for subsequent ones
        type: String,
        required: true,
        default: 'normal'
    },
    ciphertextPayload: { // The opaque E2EE payload
        type: String,
        required: true
    },
    edited: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    expiresAt: {
        type: Date,
        index: { expires: '1h' }
    }
});

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;
