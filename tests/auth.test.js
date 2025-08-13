const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');

// Mock argon2 for tests
jest.mock('argon2', () => ({
    verify: jest.fn((hash, plain) => Promise.resolve(hash === `hashed_${plain}`)),
    hash: jest.fn(plain => Promise.resolve(`hashed_${plain}`)),
}));

describe('Auth Routes', () => {
    const { setup, teardown, createTestUser, padRequest } = require('./setup');

    beforeAll(setup);

    afterAll(teardown);

    beforeEach(async () => {
        await User.deleteMany({});
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            };

            const res = await request(app)
                .post('/api/auth/register')
                .set('Content-Type', 'application/json')
                .send(padRequest(userData));

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe('User registered successfully');

            const user = await User.findOne({ email: 'test@example.com' });
            expect(user).not.toBeNull();
            expect(user.username).toBe('testuser');
            expect(user.passwordHash).toBe('hashed_password123');
        });

        it('should not create a new user with a duplicate email', async () => {
            const existingUser = await createTestUser('existinguser', 'password123');
            existingUser.email = 'test@example.com';
            await existingUser.save();

            const newUserData = {
                username: 'newuser',
                email: 'test@example.com',
                password: 'new_password'
            };
            const res = await request(app)
                .post('/api/auth/register')
                .set('Content-Type', 'application/json')
                .send(padRequest(newUserData));

            expect(res.statusCode).toBe(201);

            const users = await User.find({ email: 'test@example.com' }).lean();
            expect(users.length).toBe(1);
            expect(users[0].username).toBe('existinguser');
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            const user = await createTestUser('loginuser', 'password123');
            user.email = 'login@example.com';
            await user.save();
        });

        it('should login a user successfully and return a token', async () => {
            const loginData = {
                login: 'loginuser',
                password: 'password123'
            };

            const res = await request(app)
                .post('/api/auth/login')
                .set('Content-Type', 'application/json')
                .send(padRequest(loginData));

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('token');
        });

        it('should fail to login with an incorrect password', async () => {
            const loginData = {
                login: 'loginuser',
                password: 'wrongpassword'
            };

            const res = await request(app)
                .post('/api/auth/login')
                .set('Content-Type', 'application/json')
                .send(padRequest(loginData));

            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Invalid credentials');
        });
    });

    describe('User Profile', () => {
        it('should create a user, log them in, and fetch their profile successfully', async () => {
            const user = await createTestUser('profile_user', 'password123');
            user.email = 'profile@example.com';
            await user.save();
            const userId = user._id;

            const loginData = { login: 'profile_user', password: 'password123' };
            const loginRes = await request(app)
                .post('/api/auth/login')
                .set('Content-Type', 'application/json')
                .send(padRequest(loginData));
            const token = loginRes.body.token;
            expect(loginRes.statusCode).toBe(200);
            expect(token).toBeDefined();

            const profileRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .send();

            expect(profileRes.statusCode).toBe(200);
            expect(profileRes.body.username).toBe('profile_user');
            expect(profileRes.body.email).toBe('profile@example.com');
            expect(profileRes.body._id).toBe(userId.toString());
        });

        it('should fail to get a profile if no token is provided', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .send();

            expect(res.statusCode).toBe(401);
        });
    });
});
