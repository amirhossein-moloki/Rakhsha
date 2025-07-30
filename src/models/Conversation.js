const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['private', 'group'],
        default: 'private'
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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

const Conversation = mongoose.model('Conversation', ConversationSchema);

module.exports = Conversation;
