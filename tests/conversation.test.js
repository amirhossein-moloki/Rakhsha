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
        const participants = [userId.toString(), otherUser._id.toString()];

        const res = await request(app)
            .post('/api/conversations')
            .set('Authorization', `Bearer ${token}`)
            .send({
                type: 'private',
                participants: participants,
                name: conversationName
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('encrypted_name');
        expect(res.body).toHaveProperty('encrypted_participants');
        expect(res.body).toHaveProperty('conversationKey');

        const conversationId = res.body._id;
        const conversation = await Conversation.findById(conversationId);
        expect(conversation).not.toBeNull();

        const decryptedName = decryptSymmetric(conversation.encrypted_name, conversation.conversationKey);
        expect(decryptedName).toEqual(conversationName);

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
        expect(getConvosRes.body[0].name).toEqual(conversationName);
    });

    it('should edit a message', async () => {
        const conversationKey = generateSymmetricKey();
        const conversation = new Conversation({
            type: 'private',
            encrypted_participants: [encryptSymmetric(userId.toString(), conversationKey)],
            encrypted_name: encryptSymmetric('Test', conversationKey),
            conversationKey
        });
        await conversation.save();

        const originalContent = 'Original message';
        const encryptedOriginalContent = encryptSymmetric(originalContent, conversationKey);

        const message = new Message({
            conversationId: conversation._id,
            senderId: userId,
            encrypted_content: encryptedOriginalContent
        });
        await message.save();

        const editedContent = 'Edited message';

        const res = await request(app)
            .put(`/api/conversations/messages/${message._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                content: editedContent
            });

        expect(res.statusCode).toEqual(200);

        const updatedMessage = await Message.findById(message._id);
        const decryptedEditedContent = decryptSymmetric(updatedMessage.encrypted_content, conversationKey);
        expect(decryptedEditedContent).toEqual(editedContent);
        expect(updatedMessage.edited).toBe(true);
    });

    it('should delete a message', async () => {
        const conversationKey = generateSymmetricKey();
        const conversation = new Conversation({
            type: 'private',
            encrypted_participants: [encryptSymmetric(userId.toString(), conversationKey)],
            encrypted_name: encryptSymmetric('Test', conversationKey),
            conversationKey
        });
        await conversation.save();

        const message = new Message({
            conversationId: conversation._id,
            senderId: userId,
            encrypted_content: encryptSymmetric('Message to be deleted', conversationKey)
        });
        await message.save();

        const res = await request(app)
            .delete(`/api/conversations/messages/${message._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Message deleted');

        const deletedMessage = await Message.findById(message._id);
        expect(deletedMessage).toBeNull();
    });
});
