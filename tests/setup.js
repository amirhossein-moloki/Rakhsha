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
    const passwordHash = await argon2.hash(password);
    return new (require('../src/models/User'))({
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
};
