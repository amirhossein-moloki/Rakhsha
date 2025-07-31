const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');

// Mock argon2 for tests to ensure consistent hashing behavior
jest.mock('argon2', () => ({
    verify: jest.fn((hash, plain) => Promise.resolve(hash === `hashed_${plain}`)),
    hash: jest.fn(plain => Promise.resolve(`hashed_${plain}`)),
}));

const PADDING_SIZE = 4096;

const padRequest = (data) => {
    const dataString = JSON.stringify(data);
    const paddingNeeded = PADDING_SIZE - dataString.length;
    if (paddingNeeded > 0) {
        return { ...data, padding: 'a'.repeat(paddingNeeded) };
    }
    return data;
};

describe('User Routes', () => {
    const { setup, teardown, createTestUser } = require('./setup');
    let token;
    let userId;

    beforeAll(async () => {
        await setup();
    });

    afterAll(teardown);

    beforeEach(async () => {
        // Clear previous test data
        await User.deleteMany({});
        await Conversation.deleteMany({});
        await Message.deleteMany({});

        // Create a fresh user and log in for each test
        const user = await createTestUser('testuser', 'password123');
        userId = user._id;

        const res = await request(app)
            .post('/api/auth/login')
            .send(padRequest({ login: 'testuser', password: 'password123' }));

        expect(res.statusCode).toBe(200); // Ensure login is successful
        token = res.body.token;
        expect(token).toBeDefined();
    });

    describe('PUT /api/users/settings', () => {
        it('should update user settings successfully', async () => {
            const settings = {
                readReceiptsEnabled: true,
                secretPriceInterval: 10,
            };

            const res = await request(app)
                .put('/api/users/settings')
                .set('Authorization', `Bearer ${token}`)
                .send(settings);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Settings updated successfully.');

            const user = await User.findById(userId);
            expect(user.settings.readReceiptsEnabled).toBe(true);
            expect(user.settings.secretPriceInterval).toBe(10);
        });

        it('should not update settings with invalid secretPriceInterval', async () => {
            const settings = {
                secretPriceInterval: 13,
            };

            const res = await request(app)
                .put('/api/users/settings')
                .set('Authorization', `Bearer ${token}`)
                .send(settings);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('secretPriceInterval must be a number between 1 and 12.');
        });
    });

    describe('POST /api/users/open-secret-price', () => {
        it('should update lastSecretPriceView successfully', async () => {
            const res = await request(app)
                .post('/api/users/open-secret-price')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Secret price view time updated successfully.');

            const user = await User.findById(userId);
            const timeDiff = new Date() - user.lastSecretPriceView;
            expect(timeDiff).toBeLessThan(1000); // Check if it was updated recently
        });
    });

    describe('User Cleanup Job', () => {
        it('should remove hidden conversations from inactive user', async () => {
            const { cleanup } = require('../src/jobs/userCleanup.js');
            const User = require('../src/models/User');
            const Conversation = require('../src/models/Conversation');

            // 1. Setup users and conversations
            const inactiveUser = await User.findById(userId);
            inactiveUser.secondaryPasswordHash = await require('argon2').hash('secondary_password');
            inactiveUser.lastSecretPriceView = new Date('2020-01-01'); // Make them inactive
            inactiveUser.settings.secretPriceInterval = 1;

            const activeUser = await createTestUser('activeuser', 'password123');

            const hiddenConversation = new Conversation({
                encryptedMetadata: 'hidden_meta',
                createdAt: 'some_encrypted_date',
                isHidden: true,
            });
            await hiddenConversation.save();

            const normalConversation = new Conversation({
                encryptedMetadata: 'normal_meta',
                createdAt: 'another_encrypted_date',
                isHidden: false,
            });
            await normalConversation.save();

            inactiveUser.conversations.push(hiddenConversation._id, normalConversation._id);
            await inactiveUser.save();

            activeUser.conversations.push(hiddenConversation._id);
            await activeUser.save();

            // 2. Run the cleanup job
            await cleanup();

            // 3. Assertions
            const updatedInactiveUser = await User.findById(userId);
            expect(updatedInactiveUser).not.toBeNull();
            expect(updatedInactiveUser.secondaryPasswordHash).toBeUndefined();
            expect(updatedInactiveUser.conversations).toHaveLength(1);
            expect(updatedInactiveUser.conversations[0]).toEqual(normalConversation._id);

            // The conversation itself should still exist for the other user
            const foundHiddenConversation = await Conversation.findById(hiddenConversation._id);
            expect(foundHiddenConversation).not.toBeNull();

            // The active user should still have the conversation
            const updatedActiveUser = await User.findById(activeUser._id);
            expect(updatedActiveUser.conversations).toHaveLength(1);
            expect(updatedActiveUser.conversations[0]).toEqual(hiddenConversation._id);
        });
    });

    describe('DELETE /api/users/me', () => {
        it('should delete the authenticated user', async () => {
            const res = await request(app)
                .delete('/api/users/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('User account deleted successfully.');

            const deletedUser = await User.findById(userId);
            expect(deletedUser).toBeNull();
        });
    });

    describe('DELETE /api/users/me/secret', () => {
        it('should delete only the secret data for the authenticated user', async () => {
            const User = require('../src/models/User');
            const Conversation = require('../src/models/Conversation');

            // 1. Setup user with secret data
            const user = await User.findById(userId);
            user.secondaryPasswordHash = await require('argon2').hash('secondary_password');
            const hiddenConversation = new Conversation({
                encryptedMetadata: 'hidden_meta',
                createdAt: 'some_encrypted_date',
                isHidden: true,
            });
            await hiddenConversation.save();
            user.conversations.push(hiddenConversation._id);
            await user.save();

            // 2. Call the endpoint
            const res = await request(app)
                .delete('/api/users/me/secret')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Secret data deleted successfully.');

            // 3. Assertions
            const updatedUser = await User.findById(userId);
            expect(updatedUser).not.toBeNull();
            expect(updatedUser.secondaryPasswordHash).toBeUndefined();
            expect(updatedUser.conversations).toHaveLength(0);
        });
    });
});
