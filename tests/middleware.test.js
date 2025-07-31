const request = require('supertest');
const express = require('express');
const trafficObfuscation = require('../src/middleware/trafficObfuscation');
const requestPadding = require('../src/middleware/requestPadding');

describe('Middleware', () => {
    describe('trafficObfuscation Middleware', () => {
        const app = express();
        app.use(trafficObfuscation);
        app.get('/test', (req, res) => res.status(200).send('ok'));

        it('should add a X-Padding header to the response', async () => {
            const res = await request(app).get('/test');
            expect(res.headers).toHaveProperty('x-padding');
        });

        it('should introduce a delay', async () => {
            const startTime = Date.now();
            await request(app).get('/test');
            const endTime = Date.now();
            const duration = endTime - startTime;
            expect(duration).toBeGreaterThanOrEqual(50);
        });
    });

    describe('requestPadding Middleware', () => {
        const app = express();
        app.use(express.json());
        // Manually use the middleware without the NODE_ENV check
        const paddingMiddleware = (req, res, next) => {
            const requestPadding = require('../src/middleware/requestPadding');
            // Temporarily unset NODE_ENV to test the middleware
            const originalNodeEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = '';
            requestPadding(req, res, () => {
                process.env.NODE_ENV = originalNodeEnv;
                next();
            });
        };
        app.use(paddingMiddleware);
        app.post('/test', (req, res) => res.status(200).send('ok'));

        it('should not reject requests with exactly the right padding', async () => {
            const PADDING_SIZE = 4096;
            const body = 'a'.repeat(PADDING_SIZE);
            const res = await request(app)
                .post('/test')
                .set('Content-Type', 'text/plain')
                .set('Content-Length', PADDING_SIZE.toString())
                .send(body);
            expect(res.statusCode).toBe(200);
        });

        it('should reject requests with insufficient padding', async () => {
            const data = { message: 'hello' };
            const res = await request(app).post('/test').send(data);
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Invalid request size. All requests with a body must be padded to exactly 4096 bytes.');
        });
    });
});
