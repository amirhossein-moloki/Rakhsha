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

// Helper function to create a user with a valid, mock pre-key bundle.
// This is needed because the User model now requires these fields.
module.exports.createTestUser = (username, password) => {
    return new (require('../src/models/User'))({
        username: username,
        passwordHash: password,
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
