const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
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
    const { readReceiptsEnabled, secretPriceInterval } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).send({ error: 'User not found.' });
    }

    if (readReceiptsEnabled !== undefined) {
        if (typeof readReceiptsEnabled !== 'boolean') {
            return res.status(400).send({ error: 'readReceiptsEnabled must be a boolean.' });
        }
        user.settings.readReceiptsEnabled = readReceiptsEnabled;
    }

    if (secretPriceInterval !== undefined) {
        if (typeof secretPriceInterval !== 'number' || secretPriceInterval <= 0 || secretPriceInterval > 12) {
            return res.status(400).send({ error: 'secretPriceInterval must be a number between 1 and 12.' });
        }
        user.settings.secretPriceInterval = secretPriceInterval;
    }

    await user.save();

    res.status(200).send({ message: 'Settings updated successfully.' });
});

/**
 * @description Updates the last time user viewed the secret price
 * @route POST /api/users/open-secret-price
 * @access Private
 */
exports.openSecretPrice = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).send({ error: 'User not found.' });
    }

    user.lastSecretPriceView = new Date();
    await user.save();

    res.status(200).send({ message: 'Secret price view time updated successfully.' });
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

/**
 * @description Delete a user's account and all associated data
 * @route DELETE /api/users/me
 * @access Private
 */
exports.deleteMe = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // This is a full account deletion, so we need to delete all conversations
    // that the user is a part of. Since we don't have participant info,
    // we'll rely on the client to provide the conversation IDs, or
    // simply orphan the conversations. For now, we just delete the user doc.
    // A more robust solution would be a cleanup job that handles orphaned data.

    // Find all conversations associated with the user
    const user = await User.findById(userId).select('conversations');
    if (user && user.conversations.length > 0) {
        // Delete messages in those conversations
        await Message.deleteMany({ conversation: { $in: user.conversations } });
        // Delete the conversations themselves
        await Conversation.deleteMany({ _id: { $in: user.conversations } });
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).send({ message: 'User account deleted successfully.' });
});

/**
 * @description Delete a user's secret data only
 * @route DELETE /api/users/me/secret
 * @access Private
 */
exports.deleteSecretData = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate('conversations');

    if (!user) {
        return res.status(404).send({ error: 'User not found.' });
    }

    // Filter out hidden conversations
    const hiddenConversationIds = user.conversations
        .filter(conv => conv.isHidden)
        .map(conv => conv._id);

    if (hiddenConversationIds.length > 0) {
        // Remove hidden conversations from the user's list
        user.conversations = user.conversations.filter(conv => !conv.isHidden);
    }

    // Reset the user's secret mode fields
    user.secondaryPasswordHash = undefined;
    user.lastSecretPriceView = new Date(); // Reset the clock
    await user.save();

    res.status(200).send({ message: 'Secret data deleted successfully.' });
});

/**
 * @description Get a list of all users
 * @route GET /api/users
 * @access Private
 */
exports.getUsers = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('_id username');
    res.status(200).send(users);
});
