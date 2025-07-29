const express = require('express');
const app = express();
const trafficObfuscation = require('./middleware/trafficObfuscation');

app.use(express.json());
app.use(trafficObfuscation);

const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start cron jobs
require('./jobs/messageCleanup');

module.exports = app;
