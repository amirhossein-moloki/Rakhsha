const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { generateHiddenModeOtp, activateHiddenMode } = require('../middleware/hiddenMode');
const authMiddleware = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authController.getMe);

router.post('/generate-otp', authMiddleware, generateHiddenModeOtp);
router.post('/activate-hidden-mode', authMiddleware, activateHiddenMode);

module.exports = router;
