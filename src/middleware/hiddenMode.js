const redis = require('redis');
const client = redis.createClient();

client.on('error', (err) => console.log('Redis Client Error', err));

const activateHiddenMode = async (req, res, next) => {
    const { message } = req.body;
    const hiddenPattern = 'magic_word'; // This can be replaced with a more sophisticated pattern

    if (message && message.includes(hiddenPattern)) {
        await client.connect();
        await client.set(`hidden_mode:${req.user._id}`, 'true', 'EX', 3600); // Activate for 1 hour
        await client.disconnect();
        req.body.message = message.replace(hiddenPattern, ''); // Remove the pattern from the message
    }

    next();
};

module.exports = activateHiddenMode;
