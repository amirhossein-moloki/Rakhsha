const rateLimit = require('express-rate-limit');

// General purpose rate limiter for most API endpoints
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});

// A stricter rate limiter for resource-intensive or sensitive actions
const strictApiLimiter = rateLimit({
	windowMs: 5 * 60 * 1000, // 5 minutes
	max: 20, // Limit each IP to 20 requests per windowMs
	standardHeaders: true,
	legacyHeaders: false,
    message: { error: 'Too many requests for this action, please try again after 5 minutes' },
});


module.exports = {
    apiLimiter,
    strictApiLimiter,
};