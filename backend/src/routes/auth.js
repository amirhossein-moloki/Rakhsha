const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Rate limiter for login and other sensitive authentication endpoints
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
});

router.post('/register', authController.register);
// Apply the rate limiting middleware to login attempts
router.post('/login', loginLimiter, authController.login);
router.post('/secret-login', loginLimiter, authController.secretLogin); // Also protect secret login
router.get('/me', authMiddleware, authController.getMe); // Protected route

module.exports = router;
