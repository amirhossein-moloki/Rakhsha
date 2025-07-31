const express = require('express');
const router = express.Router();
const { uploadKeys, getPreKeyBundleForUser, getUserFingerprint, updateUserSettings, setSecondaryPassword, openSecretPrice, deleteMe, deleteSecretData } = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// All routes in this file are protected
router.use(authMiddleware);

// Route to delete the authenticated user's account
router.delete('/me', deleteMe);

// Route to delete the authenticated user's secret data
router.delete('/me/secret', deleteSecretData);

// Route to set or update the secondary password for hidden mode
router.post('/secondary-password', setSecondaryPassword);

// Route to update user settings
router.put('/settings', updateUserSettings);

// Route to open the secret price
router.post('/open-secret-price', openSecretPrice);

// Route to upload public keys. This would be used by a client to replenish their one-time keys.
router.post('/keys', uploadKeys);

// Route to get another user's pre-key bundle to initiate a session
router.get('/:username/pre-key-bundle', getPreKeyBundleForUser);

// Route for key verification (fingerprint)
router.get('/:username/fingerprint', getUserFingerprint);

module.exports = router;
