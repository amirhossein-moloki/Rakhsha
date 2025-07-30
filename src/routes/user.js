const express = require('express');
const router = express.Router();
const { uploadKeys, getKeysForUser, getUserFingerprint, updateUserSettings } = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// All routes in this file are protected
router.use(authMiddleware);

// Route to update user settings
router.put('/settings', updateUserSettings);

// Route to upload public keys
router.post('/keys', uploadKeys);

// Route to get another user's public key bundle
router.get('/:username/keys', getKeysForUser);

// Route for key verification (fingerprint)
router.get('/:username/fingerprint', getUserFingerprint);

module.exports = router;
