jest.mock('argon2', () => ({
    ...jest.requireActual('argon2'),
    verify: (hash, plain) => {
        // In tests, we can use a simple check if the plain password is 'password'
        // or whatever we set in the test user creation.
        return Promise.resolve(plain === 'password');
    },
    hash: (plain) => Promise.resolve(`hashed_${plain}`),
}));
const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const { generateSymmetricKey, encryptSymmetric, decryptSymmetric } = require('../src/utils/crypto');

describe('Conversation Routes', () => {
    let token;
    let userId;
    let user;

    const { setup, teardown } = require('./setup');
    beforeAll(setup);
    afterAll(teardown);

    beforeEach(async () => {
        await User.deleteMany({});
        await Conversation.deleteMany({});
        await Message.deleteMany({});

        // The pre-save hook will now hash 'password' into 'hashed_password' because of our mock
        user = new User({ username: 'testuser', email: 'test@test.com', passwordHash: 'password' });
        await user.save();
        userId = user._id;

        const PADDING_SIZE = 4096;
        const loginData = {
            email: 'test@test.com',
            password: 'password' // This needs to match the plain text password for argon2.verify mock
        };
        const loginDataString = JSON.stringify(loginData);
        const loginPaddingNeeded = PADDING_SIZE - loginDataString.length;
        if (loginPaddingNeeded > 0) {
            loginData.padding = 'a'.repeat(loginPaddingNeeded);
        }

        const resLogin = await request(app)
            .post('/api/auth/login')
            .send(loginData);
        token = resLogin.body.token;
    });

    it('should create a new conversation and get it', async () => {
        const otherUser = new User({ username: 'otheruser', email: 'other@test.com', passwordHash: 'testhash' });
        await otherUser.save();

        const conversationName = 'Test Conversation';
        const conversationKey = generateSymmetricKey();
        const encryptedName = encryptSymmetric(conversationName, conversationKey);
        const encryptedTimestamp = encryptSymmetric(new Date().toISOString(), conversationKey);

        const participantIds = [userId.toString(), otherUser._id.toString()];
        const participants = participantIds.map(id => encryptSymmetric(id, conversationKey));

        const PADDING_SIZE = 4096; // 4 KB
        const conversationData = {
            type: 'private',
            // The new API expects encryptedMetadata and the plaintext participantIds
            encryptedMetadata: JSON.stringify({ name: encryptedName, participants }),
            participantIds: participantIds,
            encryptedCreatedAt: encryptedTimestamp,
            conversationKey: conversationKey,
        };

        const dataString = JSON.stringify(conversationData);
        const paddingNeeded = PADDING_SIZE - dataString.length;

        if (paddingNeeded > 0) {
            conversationData.padding = 'a'.repeat(paddingNeeded);
        }

        const res = await request(app)
            .post('/api/conversations')
            .set('Authorization', `Bearer ${token}`)
            .send(conversationData);

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('encryptedMetadata', conversationData.encryptedMetadata);
        expect(res.body).toHaveProperty('createdAt', encryptedTimestamp);

        const conversationId = res.body._id;
        const conversation = await Conversation.findById(conversationId).select('+conversationKey');
        expect(conversation).not.toBeNull();

        const decryptedMetadata = JSON.parse(conversation.encryptedMetadata);
        expect(decryptSymmetric(decryptedMetadata.name, conversation.conversationKey)).toEqual(conversationName);

        // Check that the conversation is in the user's list of conversations
        const updatedUser = await User.findById(userId);
        expect(updatedUser.conversations).toContainEqual(conversation._id);

        // Check getConversations endpoint
        const getConvosRes = await request(app)
            .get('/api/conversations')
            .set('Authorization', `Bearer ${token}`);

        expect(getConvosRes.statusCode).toEqual(200);
        expect(getConvosRes.body).toBeInstanceOf(Array);
        expect(getConvosRes.body.length).toBe(1);
        expect(getConvosRes.body[0].encryptedMetadata).toEqual(conversationData.encryptedMetadata);
    });
});
