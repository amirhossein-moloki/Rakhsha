const express = require('express');
const router = express.Router();
const nodeController = require('../controllers/nodeController');

router.post('/register', nodeController.registerNode);
router.get('/', nodeController.getNodes);

module.exports = router;
