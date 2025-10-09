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

// Route imports
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const userRoutes = require('./routes/user');
const messageRoutes = require('./routes/message');
const keyRoutes = require('./routes/key');
const fileRoutes = require('./routes/file');
const nodeRoutes = require('./routes/node');

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Registering routes
// Rate limiting is now handled within the authRoutes file itself.
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/nodes', nodeRoutes);

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start cron jobs
require('./jobs/messageCleanup');
require('./jobs/userCleanup');

module.exports = app;