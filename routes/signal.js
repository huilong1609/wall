const express = require('express');
const router = express.Router();
const signalController = require('../controllers/signalController');
const { authenticate } = require('../middleware/auth');

// Signal provider routes
router.get('/providers', authenticate, signalController.getSignalProviders);
router.get('/providers/:providerId', authenticate, signalController.getProviderDetails);
router.post('/providers/:providerId/subscribe', authenticate, signalController.subscribeToProvider);
router.post('/providers/:providerId/rate', authenticate, signalController.rateProvider);
router.get('/providers/:providerId/stats', authenticate, signalController.getProviderStats);
router.post('/providers/:providerId/auto-copy', authenticate, signalController.toggleAutoCopy);

// Signal routes
router.get('/my-signals', authenticate, signalController.getMySignals);
router.get('/:signalId', authenticate, signalController.getSignalDetails);

// Provider-only routes (for creating/managing signals)
router.post('/', authenticate, signalController.createSignal);
router.put('/:signalId', authenticate, signalController.updateSignal);
router.delete('/:signalId', authenticate, signalController.deleteSignal);

module.exports = router;