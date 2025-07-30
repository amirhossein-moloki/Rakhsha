const express = require('express');
const router = express.Router();
const { uploadFile, downloadFile } = require('../controllers/fileController');
const authMiddleware = require('../middleware/auth');

// All routes in this file are protected
router.use(authMiddleware);

// Route to upload an encrypted file
router.post('/upload', uploadFile);

// Route to download an encrypted file
router.get('/:fileId', downloadFile);

module.exports = router;
