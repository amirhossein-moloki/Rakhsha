const express = require('express');
const router = express.Router();
const { updatePreKeyBundle, getPreKeyBundleByUsername } = require('../controllers/keyController');
// Correctly import the middleware without destructuring
const authMiddleware = require('../middleware/auth');

// @route   PUT /api/keys/pre-key-bundle
// @desc    Update the pre-key bundle for the authenticated user
// @access  Private
router.route('/pre-key-bundle').put(authMiddleware, updatePreKeyBundle);

// @route   GET /api/keys/:username/pre-key-bundle
// @desc    Get a user's pre-key bundle for establishing a secure session
// @access  Private
router.route('/:username/pre-key-bundle').get(authMiddleware, getPreKeyBundleByUsername);

module.exports = router;