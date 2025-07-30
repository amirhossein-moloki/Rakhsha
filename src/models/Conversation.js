const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    conversationKey: {
        type: String,
        select: false, // The server should not expose this key
    },
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
        type: String, // Encrypted Date
        required: true
    },
    lastMessageAt: {
        type: String // Encrypted Date
    },
    isHidden: {
        type: Boolean,
        default: false
    }
});

const Conversation = mongoose.model('Conversation', ConversationSchema);

module.exports = Conversation;
