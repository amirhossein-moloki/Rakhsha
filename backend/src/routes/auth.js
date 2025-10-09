const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
// Correctly import the middleware without destructuring
const authMiddleware = require('../middleware/auth');

// Rate limiter for all sensitive authentication endpoints
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Apply the rate limiting middleware to all auth routes
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/secret-login', authLimiter, authController.secretLogin);

// This route is protected by the 'authMiddleware', which already verifies the user.
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;