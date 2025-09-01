const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

module.exports.setup = async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
};

module.exports.teardown = async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
};

const argon2 = require('argon2');

// Helper function to create a user with a valid, mock pre-key bundle.
// This is needed because the User model now requires these fields.
module.exports.createTestUser = async (username, password) => {
    const User = require('../src/models/User');
    const passwordHash = await argon2.hash(password);
    const user = new User({
        username: username,
        email: `${username}@example.com`,
        passwordHash: passwordHash,
        identityKey: 'mockIdentityKey',
        preKeyBundle: {
            signedPreKey: {
                publicKey: 'mockSignedPreKeyPublic',
                signature: 'mockSignature',
            },
            oneTimePreKeys: [
                { keyId: 1, publicKey: 'mockOneTimeKeyPublic1' },
                { keyId: 2, publicKey: 'mockOneTimeKeyPublic2' },
            ],
        },
    });
    await user.save();
    return user;
};

const PADDING_SIZE = 4096; // As defined in requestPadding.js

// Helper to pad request data to a fixed size for testing the padding middleware
module.exports.padRequest = (data) => {
    // For GET requests or requests with no body, data might be undefined or null.
    if (!data) {
        return '';
    }
    const dataString = JSON.stringify(data);
    const paddingNeeded = PADDING_SIZE - Buffer.byteLength(dataString, 'utf8');
    if (paddingNeeded < 0) {
        throw new Error(`Test data is larger than PADDING_SIZE: ${dataString}`);
    }
    // We append a padding property. The server will ignore this, but it pads the request size.
    const paddedData = { ...data, _padding: 'a'.repeat(paddingNeeded) };
    // Re-stringify to check final size, adjust if necessary
    let finalString = JSON.stringify(paddedData);
    let finalPadding = PADDING_SIZE - Buffer.byteLength(finalString, 'utf8');
    if (finalPadding < 0) {
       paddedData._padding = 'a'.repeat(paddingNeeded + finalPadding);
       finalString = JSON.stringify(paddedData);
    }
    return finalString;
};
