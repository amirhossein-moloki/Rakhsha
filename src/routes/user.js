const express = require('express');
const router = express.Router();
const { uploadKeys, getKeysForUser, getUserFingerprint, updateUserSettings, setSecondaryPassword } = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// All routes in this file are protected
router.use(authMiddleware);

// Route to set or update the secondary password for hidden mode
router.post('/secondary-password', setSecondaryPassword);

// Route to update user settings
router.put('/settings', updateUserSettings);

// Route to upload public keys
router.post('/keys', uploadKeys);

// Route to get another user's public key bundle
router.get('/:username/keys', getKeysForUser);

// Route for key verification (fingerprint)
router.get('/:username/fingerprint', getUserFingerprint);

module.exports = router;
