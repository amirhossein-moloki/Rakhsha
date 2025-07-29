const crypto = require('crypto');

const trafficObfuscation = (req, res, next) => {
    if (Math.random() < 0.3) { // 30% chance to add padding
        const paddingSize = crypto.randomInt(10, 100); // Add 10 to 100 bytes of padding
        const padding = crypto.randomBytes(paddingSize);
        res.setHeader('X-Padding', padding.toString('hex'));
    }
    next();
};

module.exports = trafficObfuscation;
