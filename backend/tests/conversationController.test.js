const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');

// Mock argon2 for tests
jest.mock('argon2', () => ({
    verify: jest.fn((hash, plain) => Promise.resolve(hash === `hashed_${plain}`)),
    hash: jest.fn(plain => Promise.resolve(`hashed_${plain}`)),
}));

const PADDING_SIZE = 4096; // As defined in requestPadding.js

// Helper to pad request data
const padRequest = (data) => {
    const dataString = JSON.stringify(data);
    const paddingNeeded = PADDING_SIZE - dataString.length;
    if (paddingNeeded > 0) {
        return { ...data, padding: 'a'.repeat(paddingNeeded) };
    }
    return data;
};

describe('Conversation Routes', () => {
    const { setup, teardown, createTestUser } = require('./setup');
    let user1, user2, token1;

    beforeAll(async () => {
        await setup();
    });

    afterAll(async () => {
        await teardown();
    });

    beforeEach(async () => {
        // Clear collections before each test
        await User.deleteMany({});
        await Conversation.deleteMany({});

        // Create two users
        user1 = await createTestUser('user1', 'password123');
        user2 = await createTestUser('user2', 'password123');

        // Log in user1 to get a token
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send(padRequest({ login: 'user1', password: 'password123' }));
        token1 = loginRes.body.token;
    });

    describe('POST /api/conversations', () => {
        it('should create a new conversation between two users', async () => {
            const conversationData = {
                type: 'private',
                encryptedMetadata: 'some-encrypted-metadata',
                participantIds: [user1._id.toString(), user2._id.toString()],
                encryptedCreatedAt: new Date().toISOString(),
                conversationKey: 'some-encrypted-key'
            };

            const res = await request(app)
                .post('/api/conversations')
                .set('Authorization', `Bearer ${token1}`)
                .send(padRequest(conversationData));

            // 1. Check for successful response
            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('_id');
            expect(res.body.encryptedMetadata).toBe(conversationData.encryptedMetadata);

            // 2. Verify conversation was created in the DB
            const conversation = await Conversation.findById(res.body._id);
            expect(conversation).not.toBeNull();

            // 3. Verify that the conversation ID was added to both users
            const updatedUser1 = await User.findById(user1._id);
            const updatedUser2 = await User.findById(user2._id);

            expect(updatedUser1.conversations.map(c => c.toString())).toContain(conversation._id.toString());
            expect(updatedUser2.conversations.map(c => c.toString())).toContain(conversation._id.toString());
        });

        it('should fail to create a conversation if not authenticated', async () => {
             const conversationData = {
                type: 'private',
                encryptedMetadata: 'some-encrypted-metadata',
                participantIds: [user1._id.toString(), user2._id.toString()],
                encryptedCreatedAt: new Date().toISOString(),
                conversationKey: 'some-encrypted-key'
            };

            const res = await request(app)
                .post('/api/conversations')
                // No Authorization header
                .send(padRequest(conversationData));

            expect(res.statusCode).toBe(401); // Unauthorized
        });

        it('should be rejected if the request body is not padded to the correct size', async () => {
            const conversationData = {
                type: 'private',
                encryptedMetadata: 'some-encrypted-metadata',
                participantIds: [user1._id.toString(), user2._id.toString()],
                encryptedCreatedAt: new Date().toISOString(),
                conversationKey: 'some-encrypted-key'
            };

            const res = await request(app)
                .post('/api/conversations')
                .set('Authorization', `Bearer ${token1}`)
                .send(conversationData); // Sending unpadded data

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toContain('Invalid request size');
        });
    });
});
