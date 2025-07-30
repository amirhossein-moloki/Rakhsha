const crypto = require('crypto');

const trafficObfuscation = (req, res, next) => {
    // Randomly decide whether to add padding, with a probability between 10% and 50%
    const probability = Math.random() * 0.4 + 0.1; // Random float between 0.1 and 0.5

    if (Math.random() < probability) {
        // Add a random amount of padding, between 10 and 500 bytes
        const paddingSize = crypto.randomInt(10, 501);
        const padding = crypto.randomBytes(paddingSize);
        res.setHeader('X-Padding', padding.toString('hex'));
    }

    // Add a random delay to make traffic analysis harder
    const delay = crypto.randomInt(50, 301); // 50 to 300 ms
    setTimeout(() => {
        next();
    }, delay);
};

module.exports = trafficObfuscation;
