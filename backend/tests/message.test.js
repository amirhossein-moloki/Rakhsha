const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');

describe('Message Routes: Validation and Access Control', () => {
    let token1, token2, token3;
    let user1, user2, user3;
    let conversation;

    const { setup, teardown, createTestUser, padRequest } = require('./setup');
    beforeAll(setup);
    afterAll(teardown);

    beforeEach(async () => {
        await User.deleteMany({});
        await Conversation.deleteMany({});
        await Message.deleteMany({});

        user1 = await createTestUser('user1', 'pass1');
        user2 = await createTestUser('user2', 'pass2');
        user3 = await createTestUser('user3', 'pass3');

        const loginAndGetToken = async (username, password) => {
            const res = await request(app)
                .post('/api/auth/login')
                .set('Content-Type', 'application/json')
                .send(padRequest({ login: username, password: password }));
            expect(res.statusCode).toBe(200);
            return res.body.token;
        };

        token1 = await loginAndGetToken('user1', 'pass1');
        token2 = await loginAndGetToken('user2', 'pass2');
        token3 = await loginAndGetToken('user3', 'pass3');

        const conv = new Conversation({
            type: 'private',
            encryptedMetadata: 'some-meta-data',
            createdAt: new Date().toISOString(),
        });
        await conv.save();
        conversation = conv;

        user1.conversations.push(conversation._id);
        user2.conversations.push(conversation._id);
        await user1.save();
        await user2.save();
    });

    describe('Input Validation', () => {
        it('should return 400 if conversationId is missing', async () => {
            const messageData = { messages: [{ recipientId: user2._id.toString(), ciphertextPayload: 'test', encryptedTimestamp: 'ts' }] };
            const res = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${token1}`)
                .set('Content-Type', 'application/json')
                .send(padRequest(messageData));
            expect(res.statusCode).toBe(400);
        });

        it('should return 400 if messages array is missing', async () => {
            const messageData = { conversationId: conversation._id.toString() };
            const res = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${token1}`)
                .set('Content-Type', 'application/json')
                .send(padRequest(messageData));
            expect(res.statusCode).toBe(400);
        });

        it('should return 400 if messages array is empty', async () => {
            const messageData = { conversationId: conversation._id.toString(), messages: [] };
            const res = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${token1}`)
                .set('Content-Type', 'application/json')
                .send(padRequest(messageData));
            expect(res.statusCode).toBe(400);
        });

        it('should succeed but skip messages with invalid payload structure', async () => {
             const messageData = {
                conversationId: conversation._id.toString(),
                messages: [
                    { recipientId: user2._id.toString() },
                    { recipientId: user2._id.toString(), ciphertextPayload: 'valid_payload', encryptedTimestamp: 'valid_timestamp' }
                ],
                messageType: 'text'
            };
            const res = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${token1}`)
                .set('Content-Type', 'application/json')
                .send(padRequest(messageData));

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveLength(1);
        });
    });

    describe('Access Control', () => {
        it('should return 403 if a user tries to send a message to a conversation they are not in', async () => {
            const messageData = {
                conversationId: conversation._id.toString(),
                messages: [{
                    recipientId: user1._id.toString(),
                    ciphertextPayload: 'sneaky-message',
                    encryptedTimestamp: 'some-timestamp'
                }],
                messageType: 'text'
            };
            const res = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${token3}`)
                .set('Content-Type', 'application/json')
                .send(padRequest(messageData));

            expect(res.statusCode).toBe(403);
        });
    });
});