const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionKey: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '24h' // Sessions will be automatically removed after 24 hours
    }
});

// Create a compound index to quickly find a session for a user in a conversation
SessionSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

const Session = mongoose.model('Session', SessionSchema);

module.exports = Session;
