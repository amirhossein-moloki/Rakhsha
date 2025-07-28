const mongoose = require('mongoose');

const SecretMessageSchema = new mongoose.Schema({
    secretConversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SecretConversation',
        required: true
    },
    senderId: {
        type: String, // Can be encrypted
        required: true
    },
    encrypted_content: {
        type: String,
        required: true
    },
    encrypted_mediaUrl: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const SecretMessage = mongoose.model('SecretMessage', SecretMessageSchema);

module.exports = SecretMessage;
