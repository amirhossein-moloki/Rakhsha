const File = require('../models/File');
const Conversation = require('../models/Conversation');
const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;

// Use memory storage to handle the file as a buffer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 25 * 1024 * 1024 } }).single('file'); // 25MB limit

/**
 * @description Upload an encrypted file
 * @route POST /api/files/upload
 * @access Private
 */
exports.uploadFile = [
    upload,
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).send({ error: 'No file uploaded.' });
        }

        // Use dynamic import to load the ESM-only 'file-type' module in a CommonJS file.
        const { fileTypeFromBuffer } = await import('file-type');

        // Security: Validate file type based on magic numbers, not just client-provided mimetype.
        const detectedFileType = await fileTypeFromBuffer(req.file.buffer);

        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf', 'application/zip',
            'video/mp4', 'audio/mpeg', 'text/plain'
        ];

        let isAllowed = false;
        if (detectedFileType) {
            // If the type is detected by magic numbers, check it against the whitelist.
            if (allowedMimeTypes.includes(detectedFileType.mime)) {
                isAllowed = true;
            }
        } else {
            // If no type is detected (e.g., for plain text), fall back to the client-provided mimetype
            // but ONLY for types that are known not to have magic numbers, like text/plain.
            if (req.file.mimetype === 'text/plain') {
                isAllowed = true;
            }
        }

        if (!isAllowed) {
            return res.status(400).send({ error: 'Invalid file type.' });
        }

        const { conversationId, encryptedFilename, encryptedKeyInfo } = req.body;
        if (!conversationId || !encryptedFilename || !encryptedKeyInfo) {
            return res.status(400).send({ error: 'conversationId, encryptedFilename, and encryptedKeyInfo are required.' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).send({ error: 'Conversation not found.' });
        }

        // Authorize: Check if the user is a participant
        if (!req.user.conversations.map(id => id.toString()).includes(conversationId)) {
            return res.status(403).send({ error: 'Forbidden: You are not a participant in this conversation.' });
        }

        // Generate a random filename for storage to prevent metadata leakage
        const storageFilename = crypto.randomBytes(16).toString('hex') + path.extname(req.file.originalname);
        const storagePath = path.join('uploads', storageFilename);

        // Save the encrypted buffer to disk asynchronously
        await fs.writeFile(storagePath, req.file.buffer);

        const newFile = new File({
            conversationId,
            uploaderId: req.user._id,
            storagePath,
            encryptedFilename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            encryptedKeyInfo
        });

        await newFile.save();

        // Note: The client would typically send a message in the chat to notify
        // others about this new file, including the file ID and decryption key info.
        res.status(201).send(newFile);
    })
];

/**
 * @description Download an encrypted file
 * @route GET /api/files/:fileId
 * @access Private
 */
exports.downloadFile = asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const file = await File.findById(fileId);

    if (!file) {
        return res.status(404).send({ error: 'File not found.' });
    }

    const conversation = await Conversation.findById(file.conversationId);
    if (!conversation) {
        return res.status(404).send({ error: 'Associated conversation not found.' });
    }

    // Authorize: Check if the user is a participant
    if (!req.user.conversations.map(id => id.toString()).includes(file.conversationId.toString())) {
        return res.status(403).send({ error: 'Forbidden: You are not a participant in this conversation.' });
    }

    res.download(file.storagePath); // Stream the encrypted file to the client
});
