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
