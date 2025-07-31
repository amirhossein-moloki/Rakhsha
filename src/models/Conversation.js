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
    // The participantIds, participants, and name fields are now replaced by a single
    // encrypted blob. The server has no knowledge of who is in the conversation.
    // Authorization is handled by checking if a conversation ID exists in the user's
    // own document.
    encryptedMetadata: {
        type: String,
        required: true,
    },
    createdAt: {
        type: String, // Encrypted Date
        required: true
    },
    isHidden: {
        type: Boolean,
        default: false
    }
});

const Conversation = mongoose.model('Conversation', ConversationSchema);

module.exports = Conversation;
