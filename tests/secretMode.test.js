const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const jwt = require('jsonwebtoken');

// Mock argon2 for tests
jest.mock('argon2', () => ({
    ...jest.requireActual('argon2'),
    verify: jest.fn().mockResolvedValue(true),
    hash: jest.fn().mockResolvedValue('hashed_password'),
}));

describe('Secret Mode E2E Tests', () => {
    const { setup, teardown, createTestUser, padRequest } = require('./setup');
    let user;
    let standardToken;

    beforeAll(setup);
    afterAll(teardown);

    beforeEach(async () => {
        await User.deleteMany({});
        await Conversation.deleteMany({});

        user = await createTestUser('secret_tester', 'mainpassword');
        user.email = 'secret_tester@example.com';
        await user.save();

        standardToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    });

    describe('Secondary Password', () => {
        it('should allow a user to set a secondary password', async () => {
            const requestBody = { secondaryPassword: 'my-secret-password' };
            const res = await request(app)
                .post('/api/users/secondary-password')
                .set('Authorization', `Bearer ${standardToken}`)
                .set('Content-Type', 'application/json')
                .send(padRequest(requestBody));

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Secondary password set successfully.');

            const updatedUser = await User.findById(user._id).select('+secondaryPasswordHash');
            expect(updatedUser.secondaryPasswordHash).toBe('hashed_password');
        });

        it('should fail to set a secondary password if not authenticated', async () => {
            const requestBody = { secondaryPassword: 'my-secret-password' };
            const res = await request(app)
                .post('/api/users/secondary-password')
                .set('Content-Type', 'application/json')
                .send(padRequest(requestBody)); // No auth token

            expect(res.statusCode).toBe(401);
        });
    });

    describe('Secret Mode Login', () => {
        beforeEach(async () => {
            user.secondaryPasswordHash = 'correct-password';
            await user.save();
        });

        it('should fail with wrong secondary password', async () => {
            require('argon2').verify.mockResolvedValueOnce(false);
            const requestBody = { username: user.username, secondaryPassword: 'wrong-password' };
            const res = await request(app)
                .post('/api/auth/secret-login')
                .set('Content-Type', 'application/json')
                .send(padRequest(requestBody));

            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Invalid credentials');
        });

        it('should succeed with correct secondary password and return a secret-mode token', async () => {
            require('argon2').verify.mockResolvedValueOnce(true);
            const requestBody = { username: user.username, secondaryPassword: 'correct-password' };
            const res = await request(app)
                .post('/api/auth/secret-login')
                .set('Content-Type', 'application/json')
                .send(padRequest(requestBody));

            expect(res.statusCode).toBe(200);
            expect(res.body.token).toBeDefined();

            const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
            expect(decoded.userId).toBe(user._id.toString());
            expect(decoded.secretMode).toBe(true);
        });
    });

    describe('Conversation Visibility', () => {
        let hiddenConversation;
        let visibleConversation;
        let secretToken;

        beforeEach(async () => {
            user.secondaryPasswordHash = 'a-secret';
            await user.save();
            secretToken = jwt.sign({ userId: user._id, secretMode: true }, process.env.JWT_SECRET, { expiresIn: '1h' });

            visibleConversation = new Conversation({ encryptedMetadata: 'visible-convo', isHidden: false, createdAt: 'encrypted-date' });
            hiddenConversation = new Conversation({ encryptedMetadata: 'hidden-convo', isHidden: true, createdAt: 'encrypted-date' });
            await visibleConversation.save();
            await hiddenConversation.save();

            user.conversations.push(visibleConversation._id);
            user.conversations.push(hiddenConversation._id);
            await user.save();
        });

        it('should show only visible conversations in normal mode', async () => {
            const res = await request(app)
                .get('/api/conversations')
                .set('Authorization', `Bearer ${standardToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0]._id).toBe(visibleConversation._id.toString());
        });

        it('should show only hidden conversations in secret mode', async () => {
            const res = await request(app)
                .get('/api/conversations')
                .set('Authorization', `Bearer ${secretToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0]._id).toBe(hiddenConversation._id.toString());
        });

        it('should allow hiding a conversation', async () => {
            const res = await request(app)
                .post(`/api/conversations/${visibleConversation._id}/hide`)
                .set('Authorization', `Bearer ${standardToken}`)
                .set('Content-Type', 'application/json')
                .send(padRequest({}));

            expect(res.statusCode).toBe(200);
            const updatedConvo = await Conversation.findById(visibleConversation._id);
            expect(updatedConvo.isHidden).toBe(true);
        });

        it('should allow unhiding a conversation', async () => {
            const res = await request(app)
                .post(`/api/conversations/${hiddenConversation._id}/unhide`)
                .set('Authorization', `Bearer ${standardToken}`)
                .set('Content-Type', 'application/json')
                .send(padRequest({}));

            expect(res.statusCode).toBe(200);
            const updatedConvo = await Conversation.findById(hiddenConversation._id);
            expect(updatedConvo.isHidden).toBe(false);
        });
    });
});
