const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const File = require('../src/models/File');
const fs = require('fs/promises');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

describe('File Upload Routes', () => {
    let token;
    let userId;
    let conversation;

    const { setup, teardown, createTestUser } = require('./setup');
    beforeAll(async () => {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
        await setup();
    });

    afterAll(async () => {
        await fs.rm(UPLOADS_DIR, { recursive: true, force: true });
        await teardown();
    });

    beforeEach(async () => {
        await User.deleteMany({});
        await Conversation.deleteMany({});
        await File.deleteMany({});

        const user = await createTestUser('fileuser', 'password');
        user.email = 'fileuser@example.com';
        await user.save();
        userId = user._id;

        const loginData = { login: 'fileuser', password: 'password' };
        const resLogin = await request(app).post('/api/auth/login').send(loginData);
        token = resLogin.body.token;

        conversation = new Conversation({
            type: 'private',
            participantIds: [userId],
            encryptedMetadata: 'test',
            createdAt: new Date().toISOString(),
        });
        await conversation.save();
        user.conversations.push(conversation._id);
        await user.save();
    });

    it('should upload a file and associate it with a conversation', async () => {
        const filePath = path.join(__dirname, 'test-file.txt');
        await fs.writeFile(filePath, 'This is a test file.');

        const res = await request(app)
            .post('/api/files/upload')
            .set('Authorization', `Bearer ${token}`)
            .field('conversationId', conversation._id.toString())
            .field('encryptedFilename', 'test-file-encrypted.txt')
            .field('encryptedKeyInfo', 'some-key-info')
            .field('padding', 'a'.repeat(4000)) // Add padding
            .attach('file', filePath);

        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('storagePath');
        expect(res.body.encryptedFilename).toBe('test-file-encrypted.txt');

        const file = await File.findById(res.body._id);
        expect(file).not.toBeNull();
        expect(file.conversationId.toString()).toBe(conversation._id.toString());

        await fs.unlink(filePath); // Clean up the test file
    });
});
