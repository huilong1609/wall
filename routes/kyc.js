const express = require('express');
const router = express.Router();
const kycController = require('../controllers/kycController');
const { authenticate } = require('../middleware/auth');
const { validate, body, param } = require('../middleware/validation');

router.get('/status', authenticate, kycController.getKycStatus);
router.get('/documents', authenticate, kycController.getDocuments);
router.post('/basic-info', authenticate, [
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('phone').optional().trim(),
  body('country').trim().notEmpty(),
  body('city').optional().trim(),
], validate, kycController.submitBasicInfo);
router.post('/id-document', authenticate, [body('type').notEmpty(), body('url').notEmpty()], validate, kycController.submitIdDocument);
router.post('/selfie', authenticate, [body('url').notEmpty()], validate, kycController.submitSelfie);
router.post('/address-proof', authenticate, [body('type').notEmpty(), body('url').notEmpty()], validate, kycController.submitAddressProof);

module.exports = router;
