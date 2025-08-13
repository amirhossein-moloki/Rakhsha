const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');

// Mock argon2 for tests
jest.mock('argon2', () => ({
    verify: jest.fn((hash, plain) => Promise.resolve(hash === `hashed_${plain}`)),
    hash: jest.fn(plain => Promise.resolve(`hashed_${plain}`)),
}));

describe('User Routes', () => {
    const { setup, teardown, createTestUser, padRequest } = require('./setup');
    let token;
    let userId;

    beforeAll(async () => {
        await setup();
    });

    afterAll(teardown);

    beforeEach(async () => {
        await User.deleteMany({});
        await Conversation.deleteMany({});
        await Message.deleteMany({});

        const user = await createTestUser('testuser', 'password123');
        userId = user._id;

        const res = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send(padRequest({ login: 'testuser', password: 'password123' }));

        expect(res.statusCode).toBe(200);
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
                .set('Content-Type', 'application/json')
                .send(padRequest(settings));

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
                .set('Content-Type', 'application/json')
                .send(padRequest(settings));

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('secretPriceInterval must be a number between 1 and 12.');
        });
    });

    describe('POST /api/users/open-secret-price', () => {
        it('should update lastSecretPriceView successfully', async () => {
            const res = await request(app)
                .post('/api/users/open-secret-price')
                .set('Authorization', `Bearer ${token}`)
                .set('Content-Type', 'application/json')
                .send(padRequest({})); // Send padded empty object for POST request

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Secret price view time updated successfully.');

            const user = await User.findById(userId);
            const timeDiff = new Date() - user.lastSecretPriceView;
            expect(timeDiff).toBeLessThan(1000);
        });
    });

    // Note: The cleanup job test does not make HTTP requests, so it doesn't need padding.
    describe('User Cleanup Job', () => {
        it('should remove hidden conversations from inactive user', async () => {
            const { cleanup } = require('../src/jobs/userCleanup.js');
            const User = require('../src/models/User');
            const Conversation = require('../src/models/Conversation');

            const inactiveUser = await User.findById(userId);
            inactiveUser.secondaryPasswordHash = await require('argon2').hash('secondary_password');
            inactiveUser.lastSecretPriceView = new Date('2020-01-01');
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

            await cleanup();

            const updatedInactiveUser = await User.findById(userId);
            expect(updatedInactiveUser).not.toBeNull();
            expect(updatedInactiveUser.secondaryPasswordHash).toBeUndefined();
            expect(updatedInactiveUser.conversations).toHaveLength(1);
            expect(updatedInactiveUser.conversations[0]).toEqual(normalConversation._id);

            const foundHiddenConversation = await Conversation.findById(hiddenConversation._id);
            expect(foundHiddenConversation).not.toBeNull();

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

            const res = await request(app)
                .delete('/api/users/me/secret')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Secret data deleted successfully.');

            const updatedUser = await User.findById(userId);
            expect(updatedUser).not.toBeNull();
            expect(updatedUser.secondaryPasswordHash).toBeUndefined();
            expect(updatedUser.conversations).toHaveLength(0);
        });
    });
});
