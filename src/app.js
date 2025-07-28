const express = require('express');
const app = express();

app.use(express.json());

const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);

module.exports = app;
