const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const jwt = require('jsonwebtoken');

// Mock argon2 for tests
jest.mock('argon2', () => ({
    ...jest.requireActual('argon2'), // Import and retain default behavior
    verify: jest.fn().mockResolvedValue(true), // Mock verify to always resolve true
    hash: jest.fn().mockResolvedValue('hashed_password'), // Mock hash to return a fixed string
}));

const PADDING_SIZE = 4096; // 4 KB, as defined in requestPadding.js

// Helper to pad request data
const padRequest = (data) => {
    const dataString = JSON.stringify(data);
    const paddingNeeded = PADDING_SIZE - dataString.length;
    if (paddingNeeded > 0) {
        return { ...data, padding: 'a'.repeat(paddingNeeded) };
    }
    return data;
};

describe('Secret Mode E2E Tests', () => {
    const { setup, teardown, createTestUser } = require('./setup');
    let user;
    let standardToken;

    // Setup and teardown the in-memory database
    beforeAll(setup);
    afterAll(teardown);

    // Create a fresh user and token before each test
    beforeEach(async () => {
        await User.deleteMany({});
        await Conversation.deleteMany({});

        // Create a standard user using the helper
        user = createTestUser('secret_tester', 'mainpassword');
        await user.save();

        // Generate a standard token for the user
        standardToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    });

    describe('Secondary Password', () => {
        it('should allow a user to set a secondary password', async () => {
            const requestBody = padRequest({ secondaryPassword: 'my-secret-password' });
            const res = await request(app)
                .post('/api/users/secondary-password')
                .set('Authorization', `Bearer ${standardToken}`)
                .send(requestBody);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Secondary password set successfully.');

            // Verify the hash was stored in the DB
            const updatedUser = await User.findById(user._id).select('+secondaryPasswordHash');
            expect(updatedUser.secondaryPasswordHash).toBe('hashed_password');
        });

        it('should fail to set a secondary password if not authenticated', async () => {
            const requestBody = padRequest({ secondaryPassword: 'my-secret-password' });
            const res = await request(app)
                .post('/api/users/secondary-password')
                .send(requestBody); // No auth token

            expect(res.statusCode).toBe(401);
        });
    });

    describe('Secret Mode Login', () => {
        beforeEach(async () => {
            // Set a secondary password for the user first
            user.secondaryPasswordHash = 'correct-password';
            await user.save();
        });

        it('should fail with wrong secondary password', async () => {
            // Mock argon2.verify to return false for this test
            require('argon2').verify.mockResolvedValueOnce(false);
            const requestBody = padRequest({ username: user.username, secondaryPassword: 'wrong-password' });
            const res = await request(app)
                .post('/api/auth/secret-login')
                .send(requestBody);

            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Invalid credentials');
        });

        it('should succeed with correct secondary password and return a secret-mode token', async () => {
            // Mock argon2.verify to return true
            require('argon2').verify.mockResolvedValueOnce(true);
            const requestBody = padRequest({ username: user.username, secondaryPassword: 'correct-password' });
            const res = await request(app)
                .post('/api/auth/secret-login')
                .send(requestBody);

            expect(res.statusCode).toBe(200);
            expect(res.body.token).toBeDefined();

            // Verify the token payload
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
            // Set secondary password and get a secret token
            user.secondaryPasswordHash = 'a-secret';
            await user.save();
            secretToken = jwt.sign({ userId: user._id, secretMode: true }, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Create one visible and one hidden conversation
            visibleConversation = new Conversation({ encryptedMetadata: 'visible-convo', isHidden: false, createdAt: 'encrypted-date' });
            hiddenConversation = new Conversation({ encryptedMetadata: 'hidden-convo', isHidden: true, createdAt: 'encrypted-date' });
            await visibleConversation.save();
            await hiddenConversation.save();

            // Add these conversations to the user's list for the new authorization model
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
                .send(padRequest({})); // Send padded empty object

            expect(res.statusCode).toBe(200);
            const updatedConvo = await Conversation.findById(visibleConversation._id);
            expect(updatedConvo.isHidden).toBe(true);
        });

        it('should allow unhiding a conversation', async () => {
            const res = await request(app)
                .post(`/api/conversations/${hiddenConversation._id}/unhide`)
                .set('Authorization', `Bearer ${standardToken}`)
                .send(padRequest({})); // Send padded empty object

            expect(res.statusCode).toBe(200);
            const updatedConvo = await Conversation.findById(hiddenConversation._id);
            expect(updatedConvo.isHidden).toBe(false);
        });
    });
});
