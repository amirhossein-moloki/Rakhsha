const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/secret-login', authController.secretLogin); // New route for secret mode
router.get('/me', authMiddleware, authController.getMe); // Protected route

module.exports = router;
