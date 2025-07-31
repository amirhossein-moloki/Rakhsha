const crypto = require('crypto');

const trafficObfuscation = (req, res, next) => {
    // Always add a fixed amount of padding to make response sizes more uniform.
    const paddingSize = 256; // 256 bytes
    const padding = crypto.randomBytes(paddingSize);
    res.setHeader('X-Padding', padding.toString('hex'));

    // Add a random delay to make traffic analysis harder
    const delay = crypto.randomInt(50, 301); // 50 to 300 ms
    setTimeout(() => {
        next();
    }, delay);
};

module.exports = trafficObfuscation;
