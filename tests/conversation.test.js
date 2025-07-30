jest.mock('bcryptjs');
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

        user = new User({ username: 'testuser', email: 'test@test.com', passwordHash: 'testhash' });
        await user.save();
        userId = user._id;

        const resLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@test.com',
                password: 'password' // In test env, password check is mocked to always pass
            });
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

        const res = await request(app)
            .post('/api/conversations')
            .set('Authorization', `Bearer ${token}`)
            .send({
                type: 'private',
                participants: participants,
                participantIds: participantIds,
                name: encryptedName,
                encryptedCreatedAt: encryptedTimestamp,
                conversationKey: conversationKey
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('name', encryptedName);
        expect(res.body).toHaveProperty('createdAt', encryptedTimestamp);

        const conversationId = res.body._id;
        const conversation = await Conversation.findById(conversationId).select('+conversationKey');
        expect(conversation).not.toBeNull();
        expect(decryptSymmetric(conversation.name, conversation.conversationKey)).toEqual(conversationName);

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
        expect(getConvosRes.body[0].name).toEqual(encryptedName);
    });
});
