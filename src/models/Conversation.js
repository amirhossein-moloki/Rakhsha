const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['private', 'group'],
        default: 'private'
    },
    participantIds: [{ // Plaintext user IDs for server-side logic
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    participants: [{ // Opaque, encrypted payload for each participant
        type: String
    }],
    name: {
        type: String // This will now store an opaque, encrypted payload for the conversation name
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
