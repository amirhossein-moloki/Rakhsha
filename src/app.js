const express = require('express');
const app = express();
const trafficObfuscation = require('./middleware/trafficObfuscation');
const requestPadding = require('./middleware/requestPadding');

app.use(express.json());

// Apply traffic obfuscation middleware to all responses
app.use(trafficObfuscation);
// Apply request padding middleware to all requests
app.use(requestPadding);

const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const userRoutes = require('./routes/user');
const messageRoutes = require('./routes/message');
const fileRoutes = require('./routes/file');

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start cron jobs
require('./jobs/messageCleanup');

module.exports = app;
