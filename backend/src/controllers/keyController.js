const asyncHandler = require('express-async-handler');
const User = require('../models/User');

/**
 * @desc    Update user's pre-key bundle
 * @route   PUT /api/keys/pre-key-bundle
 * @access  Private
 */
const updatePreKeyBundle = asyncHandler(async (req, res) => {
    const { identityKey, registrationId, signedPreKey, oneTimePreKeys } = req.body;

    // Basic validation to ensure essential parts are present
    if (!identityKey || !registrationId || !signedPreKey || !oneTimePreKeys) {
        res.status(400);
        throw new Error('Incomplete pre-key bundle provided.');
    }

    const user = await User.findById(req.user.id);

    if (user) {
        user.identityKey = identityKey;
        user.registrationId = registrationId;
        user.preKeyBundle = {
            signedPreKey,
            oneTimePreKeys
        };

        await user.save();

        res.status(200).json({
            message: 'Pre-key bundle updated successfully.'
        });
    } else {
        res.status(404);
        throw new Error('User not found.');
    }
});

/**
 * @desc    Get a user's pre-key bundle by their username
 * @route   GET /api/keys/:username/pre-key-bundle
 * @access  Private
 */
const getPreKeyBundleByUsername = asyncHandler(async (req, res) => {
    // We only select the fields necessary for building a session.
    // This prevents leaking other user data.
    const user = await User.findOne({ username: req.params.username }).select(
        'identityKey registrationId preKeyBundle.signedPreKey preKeyBundle.oneTimePreKeys'
    );

    if (user && user.identityKey) {
        // Find a random one-time pre-key and remove it.
        // This is a critical part of the X3DH protocol to prevent replay attacks.
        let oneTimePreKey = null;
        if (user.preKeyBundle.oneTimePreKeys && user.preKeyBundle.oneTimePreKeys.length > 0) {
            const randomIndex = Math.floor(Math.random() * user.preKeyBundle.oneTimePreKeys.length);
            oneTimePreKey = user.preKeyBundle.oneTimePreKeys.splice(randomIndex, 1)[0];
            await user.save(); // Persist the removal of the one-time key
        }

        res.status(200).json({
            identityKey: user.identityKey,
            registrationId: user.registrationId,
            signedPreKey: user.preKeyBundle.signedPreKey,
            // Only return the single one-time pre-key that was selected.
            oneTimePreKey: oneTimePreKey
        });
    } else {
        res.status(404);
        throw new Error('User or key bundle not found.');
    }
});


module.exports = {
    updatePreKeyBundle,
    getPreKeyBundleByUsername
};