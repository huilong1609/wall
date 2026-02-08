const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');
const { authenticate } = require('../middleware/auth');

// Marketplace routes
router.get('/marketplace', authenticate, botController.getMarketplaceBots);
router.get('/marketplace/:botId', authenticate, botController.getMarketplaceBotDetails);
router.post('/marketplace/:botId/subscribe', authenticate, botController.subscribeToBot);
router.post('/marketplace/:botId/rate', authenticate, botController.rateBotMarketplace);

// User bot management
router.get('/my-bots', authenticate, botController.getMyBots);
router.post('/deploy/:botMarketplaceId', authenticate, botController.deployBot);
router.post('/:botId/start', authenticate, botController.startBot);
router.post('/:botId/stop', authenticate, botController.stopBot);
router.post('/:botId/pause', authenticate, botController.pauseBot);
router.post('/:botId/resume', authenticate, botController.resumeBot);
router.put('/:botId/config', authenticate, botController.updateBotConfig);
router.delete('/:botId', authenticate, botController.deleteBot);
router.get('/:botId/stats', authenticate, botController.getBotStats);

module.exports = router;