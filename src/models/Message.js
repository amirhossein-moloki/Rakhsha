const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    // The senderId is now encrypted with the recipient's public key.
    // The server cannot know who the sender is.
    encryptedSenderId: {
        type: String,
        required: true
    },
    // We still need to know the recipient to route the message.
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    contentType: {
        type: String,
        enum: ['text', 'image'],
        default: 'text'
    },
    encrypted_content: {
        type: String,
        trim: true
    },
    edited: {
        type: Boolean,
        default: false
    },
    hidden: {
        type: Boolean,
        default: false
    },
    encrypted_mediaUrl: {
        type: String
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
