const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');

/**
 * @description Upload user's public key bundle
 * @route POST /api/users/keys
 * @access Private
 */
exports.uploadKeys = asyncHandler(async (req, res) => {
    const { identityKey, preKeyBundle } = req.body;
    if (!identityKey || !preKeyBundle) {
        return res.status(400).send({ error: 'identityKey and preKeyBundle are required.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).send({ error: 'User not found.' });
    }

    user.identityKey = identityKey;
    user.preKeyBundle = preKeyBundle;
    await user.save();

    res.status(200).send({ message: 'Keys uploaded successfully.' });
});

/**
 * @description Get a user's public key bundle
 * @route GET /api/users/:username/keys
 * @access Private
 */
exports.getKeysForUser = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const user = await User.findOne({ username });

    if (!user || !user.preKeyBundle) {
        return res.status(404).send({ error: 'Keys for user not found.' });
    }

    res.status(200).send({
        identityKey: user.identityKey,
        preKeyBundle: user.preKeyBundle
    });
});

/**
 * @description Get a user's public key fingerprint
 * @route GET /api/users/:username/fingerprint
 * @access Private
 */
exports.getUserFingerprint = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const user = await User.findOne({ username }).select('identityKey');

    if (!user || !user.identityKey) {
        return res.status(404).send({ error: 'Identity key for user not found.' });
    }

    // The fingerprint is a hash of the public identity key.
    // This provides a smaller, more manageable string for users to compare.
    const fingerprint = crypto.createHash('sha256').update(user.identityKey).digest('hex');

    res.status(200).send({ username: user.username, fingerprint });
});

/**
 * @description Update user settings
 * @route PUT /api/users/settings
 * @access Private
 */
exports.updateUserSettings = asyncHandler(async (req, res) => {
    const { readReceiptsEnabled } = req.body;

    if (typeof readReceiptsEnabled !== 'boolean') {
        return res.status(400).send({ error: 'readReceiptsEnabled must be a boolean.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).send({ error: 'User not found.' });
    }

    user.settings.readReceiptsEnabled = readReceiptsEnabled;
    await user.save();

    res.status(200).send({ message: 'Settings updated successfully.' });
});
