const User = require('../models/User');
const jwt = require('jsonwebtoken');
const argon2 = require('argon2');
const { generateECDHKeyPair, sign } = require('../utils/crypto');


exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).send({ error: 'Username, email, and password are required' });
        }

        // 1. Generate Identity Key
        const identityKeyPair = generateECDHKeyPair();

        // 2. Generate Signed Pre-Key
        const signedPreKeyPair = generateECDHKeyPair();

        // 3. Sign the public part of the signed pre-key with the private identity key
        const signature = sign(signedPreKeyPair.publicKey, identityKeyPair.privateKey);

        // 4. Generate One-Time Pre-Keys
        const oneTimePreKeys = [];
        for (let i = 0; i < 50; i++) {
            const oneTimePreKeyPair = generateECDHKeyPair();
            oneTimePreKeys.push({
                keyId: i + 1,
                publicKey: oneTimePreKeyPair.publicKey,
            });
        }

        const passwordHash = await argon2.hash(password);

        const user = new User({
            username,
            email,
            passwordHash,
            identityKey: identityKeyPair.publicKey,
            preKeyBundle: {
                signedPreKey: {
                    publicKey: signedPreKeyPair.publicKey,
                    signature: signature,
                },
                oneTimePreKeys: oneTimePreKeys,
            },
        });

        // We will attempt to save the user. If it fails due to a duplicate key,
        // the catch block will handle it. In either case, we send a success
        // response to prevent username enumeration.
        await user.save();
        res.status(201).send({ message: 'User registered successfully' });
    } catch (error) {
        // If the error is a duplicate key error (code 11000), we silently absorb it
        // and send a generic success response. For any other error, we still send
        // a generic success message but log the error for debugging.
        if (error.code !== 11000) {
            console.error('Registration failed for a reason other than duplicate user:', error);
        }
        // IMPORTANT: Always send a success response to prevent username enumeration.
        res.status(201).send({ message: 'User registered successfully' });
    }
};

exports.login = async (req, res) => {
    try {
        const { login, password } = req.body; // 'login' can be username or email
        if (!password || !login) {
            return res.status(400).send({ error: 'Login identifier and password are required' });
        }

        const user = await User.findOne({
            $or: [{ username: login }, { email: login }],
        });

        if (!user) {
            return res.status(401).send({ error: 'Invalid credentials' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).send({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.send({ token });
    } catch (error) {
        res.status(400).send({ error: 'Failed to login' });
    }
};

exports.secretLogin = async (req, res) => {
    try {
        const { username, secondaryPassword } = req.body;
        if (!username || !secondaryPassword) {
            return res.status(400).send({ error: 'Username and secondary password are required' });
        }

        const user = await User.findOne({ username }).select('+secondaryPasswordHash');
        if (!user || !user.secondaryPasswordHash) {
            // We use a generic error message to avoid revealing whether a user exists or has a secondary password.
            return res.status(401).send({ error: 'Invalid credentials' });
        }

        const isMatch = await argon2.verify(user.secondaryPasswordHash, secondaryPassword);
        if (!isMatch) {
            return res.status(401).send({ error: 'Invalid credentials' });
        }

        // The token payload now includes a `secretMode` flag
        const token = jwt.sign(
            { userId: user._id, secretMode: true },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.send({ token });
    } catch (error) {
        res.status(400).send({ error: 'Failed to login to secret mode' });
    }
};

exports.getMe = async (req, res) => {
    // The user object is already fetched and attached to the request by the auth middleware.
    // We can just send it back.
    res.send(req.user);
};
