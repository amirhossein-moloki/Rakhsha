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
 * @description Get a user's pre-key bundle for initiating a secure session.
 *              This fetches the identity key, the signed pre-key, and ONE
 *              one-time pre-key. The one-time pre-key is then removed.
 * @route GET /api/users/:username/pre-key-bundle
 * @access Private
 */
exports.getPreKeyBundleForUser = asyncHandler(async (req, res) => {
    const { username } = req.params;

    // Atomically find the user and pop one key from the oneTimePreKeys array.
    const user = await User.findOneAndUpdate(
        { username },
        { $pop: { 'preKeyBundle.oneTimePreKeys': -1 } }, // -1 pops from the beginning (FIFO)
        { new: false } // Return the document *before* the update
    );

    if (!user || !user.preKeyBundle || user.preKeyBundle.oneTimePreKeys.length === 0) {
        // If the user is not found, or has no keys left, return an error.
        // The client should probably try again later if the user runs out of keys.
        return res.status(404).send({ error: 'Pre-key bundle for user not found or user has no available one-time keys.' });
    }

    // The key that was just popped is the first one in the array from the document before the update.
    const oneTimePreKey = user.preKeyBundle.oneTimePreKeys[0];

    res.status(200).send({
        identityKey: user.identityKey,
        signedPreKey: user.preKeyBundle.signedPreKey,
        oneTimePreKey: oneTimePreKey,
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

/**
 * @description Set or update the user's secondary password for hidden mode
 * @route POST /api/users/secondary-password
 * @access Private
 */
exports.setSecondaryPassword = asyncHandler(async (req, res) => {
    const { secondaryPassword } = req.body;

    if (!secondaryPassword || typeof secondaryPassword !== 'string' || secondaryPassword.length < 8) {
        return res.status(400).send({ error: 'Secondary password must be a string of at least 8 characters.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).send({ error: 'User not found.' });
    }

    // The hashing is now handled by the pre-save hook in the User model
    user.secondaryPasswordHash = secondaryPassword;
    await user.save();

    res.status(200).send({ message: 'Secondary password set successfully.' });
});
