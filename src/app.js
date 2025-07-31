const express = require('express');
const helmet = require('helmet');
const app = express();
const trafficObfuscation = require('./middleware/trafficObfuscation');
const requestPadding = require('./middleware/requestPadding');

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
    })
);
app.use(express.json());

// Apply traffic obfuscation middleware to all responses
app.use(trafficObfuscation);
// Apply request padding middleware to all requests
app.use(requestPadding);

const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const userRoutes = require('./routes/user');
const messageRoutes = require('./routes/message');
const fileRoutes = require('./routes/file');
const nodeRoutes = require('./routes/node');

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Apply rate limiting to authentication routes
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per window
	standardHeaders: true,
	legacyHeaders: false,
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/nodes', nodeRoutes);

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start cron jobs
require('./jobs/messageCleanup');

module.exports = app;
