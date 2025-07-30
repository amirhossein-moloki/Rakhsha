const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    // The conversation this file belongs to.
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    // The user who uploaded the file.
    uploaderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // The path to the encrypted file on disk.
    storagePath: {
        type: String,
        required: true
    },
    // The original filename, encrypted by the client.
    encryptedFilename: {
        type: String,
        required: true
    },
    // The file's MIME type.
    mimetype: {
        type: String,
        required: true
    },
    // The size of the encrypted file in bytes.
    size: {
        type: Number,
        required: true
    },
    // The client-generated key needed to decrypt the file. Opaque to server.
    encryptedKeyInfo: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const File = mongoose.model('File', FileSchema);

module.exports = File;
