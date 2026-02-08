const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/plans', publicController.getPlans);
router.get('/email', publicController.sendEmail);

module.exports = router;