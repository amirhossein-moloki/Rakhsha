jest.mock('bcryptjs');
const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');

describe('Conversation Routes', () => {
    let token;
    let userId;

    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    }, 60000);

    afterAll(async () => {
        await mongoose.connection.close();
    });

    afterEach(async () => {
        await User.deleteMany({});
        await Conversation.deleteMany({});
        await Message.deleteMany({});
    });

    it('should create a new conversation', async () => {
        const user = new User({ username: 'testuser', email: 'test@test.com', passwordHash: 'testhash' });
        await user.save();
        userId = user._id;

        const resLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@test.com',
                password: 'password'
            });
        token = resLogin.body.token;

        const res = await request(app)
            .post('/api/conversations')
            .set('Authorization', `Bearer ${token}`)
            .send({
                type: 'private',
                participants: [userId],
                name: 'Test Conversation'
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('name', 'Test Conversation');
    });

    it('should edit a message', async () => {
        const user = new User({ username: 'testuser', email: 'test@test.com', passwordHash: 'testhash' });
        await user.save();
        userId = user._id;

        const resLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@test.com',
                password: 'password'
            });
        token = resLogin.body.token;

        const conversation = new Conversation({
            type: 'private',
            participants: [userId]
        });
        await conversation.save();

        const message = new Message({
            conversationId: conversation._id,
            senderId: userId,
            content: 'Original message'
        });
        await message.save();

        const res = await request(app)
            .put(`/api/conversations/messages/${message._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                content: 'Edited message'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('content', 'Edited message');
        expect(res.body).toHaveProperty('edited', true);
    });

    it('should delete a message', async () => {
        const user = new User({ username: 'testuser', email: 'test@test.com', passwordHash: 'testhash' });
        await user.save();
        userId = user._id;

        const resLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@test.com',
                password: 'password'
            });
        token = resLogin.body.token;

        const conversation = new Conversation({
            type: 'private',
            participants: [userId]
        });
        await conversation.save();

        const message = new Message({
            conversationId: conversation._id,
            senderId: userId,
            content: 'Message to be deleted'
        });
        await message.save();

        const res = await request(app)
            .delete(`/api/conversations/messages/${message._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Message deleted');
    });
});
