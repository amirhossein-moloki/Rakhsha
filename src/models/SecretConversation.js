const mongoose = require('mongoose');

const SecretConversationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['private', 'group'],
        default: 'private'
    },
    encrypted_participants: [{
        type: String
    }],
    encrypted_name: {
        type: String
    },
    conversationKey: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    }
});

const SecretConversation = mongoose.model('SecretConversation', SecretConversationSchema);

module.exports = SecretConversation;
