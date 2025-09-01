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

    const { setup, teardown, createTestUser, padRequest } = require('./setup');
    beforeAll(setup);
    afterAll(teardown);

    beforeEach(async () => {
        await User.deleteMany({});
        await Conversation.deleteMany({});
        await Message.deleteMany({});

        user = await createTestUser('testuser', 'password123');
        await user.save();
        userId = user._id;

        const loginData = {
            login: 'testuser',
            password: 'password123'
        };

        const resLogin = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send(padRequest(loginData));

        if (resLogin.statusCode !== 200) {
            console.error('Login failed in test setup:', resLogin.body);
        }
        expect(resLogin.statusCode).toBe(200);
        token = resLogin.body.token;
    });

    it('should create a new conversation and get it', async () => {
        const otherUser = await createTestUser('otheruser', 'password123');
        await otherUser.save();

        const conversationName = 'Test Conversation';
        const conversationKey = generateSymmetricKey();
        const encryptedName = encryptSymmetric(conversationName, conversationKey);
        const encryptedTimestamp = encryptSymmetric(new Date().toISOString(), conversationKey);

        const participantIds = [userId.toString(), otherUser._id.toString()];
        const participants = participantIds.map(id => encryptSymmetric(id, conversationKey));

        const conversationData = {
            type: 'private',
            encryptedMetadata: JSON.stringify({ name: encryptedName, participants }),
            participantIds: participantIds,
            encryptedCreatedAt: encryptedTimestamp,
            conversationKey: conversationKey,
        };

        const res = await request(app)
            .post('/api/conversations')
            .set('Authorization', `Bearer ${token}`)
            .set('Content-Type', 'application/json')
            .send(padRequest(conversationData));

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('encryptedMetadata', conversationData.encryptedMetadata);
        expect(res.body).toHaveProperty('createdAt', encryptedTimestamp);

        const conversationId = res.body._id;
        const conversation = await Conversation.findById(conversationId).select('+conversationKey');
        expect(conversation).not.toBeNull();

        const decryptedMetadata = JSON.parse(conversation.encryptedMetadata);
        expect(decryptSymmetric(decryptedMetadata.name, conversation.conversationKey)).toEqual(conversationName);

        const updatedUser = await User.findById(userId);
        expect(updatedUser.conversations).toContainEqual(conversation._id);

        const getConvosRes = await request(app)
            .get('/api/conversations')
            .set('Authorization', `Bearer ${token}`);

        expect(getConvosRes.statusCode).toEqual(200);
        expect(getConvosRes.body).toBeInstanceOf(Array);
        expect(getConvosRes.body.length).toBe(1);
        expect(getConvosRes.body[0].encryptedMetadata).toEqual(conversationData.encryptedMetadata);
    });
});
