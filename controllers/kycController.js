const kycService = require('../services/kycService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getKycStatus = asyncHandler(async (req, res) => {
  const status = await kycService.getKycStatus(req.user.id);
  ApiResponse.success(res, { kyc: status });
});

exports.submitBasicInfo = asyncHandler(async (req, res) => {
  const result = await kycService.submitBasicInfo(req.user.id, req.body);
  ApiResponse.success(res, result, 'Basic information submitted');
});

exports.submitIdDocument = asyncHandler(async (req, res) => {
  const result = await kycService.submitIdDocument(req.user.id, req.body);
  ApiResponse.success(res, result, 'Document submitted for review');
});

exports.submitSelfie = asyncHandler(async (req, res) => {
  const result = await kycService.submitSelfie(req.user.id, req.body);
  ApiResponse.success(res, result, 'Selfie submitted for review');
});

exports.submitAddressProof = asyncHandler(async (req, res) => {
  const result = await kycService.submitAddressProof(req.user.id, req.body);
  ApiResponse.success(res, result, 'Address proof submitted for review');
});

exports.getDocuments = asyncHandler(async (req, res) => {
  const documents = await kycService.getDocuments(req.user.id);
  ApiResponse.success(res, { documents });
});
