const apiKeyService = require('../services/apiKeyService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getApiKeys = asyncHandler(async (req, res) => {
  const apiKeys = await apiKeyService.getApiKeys(req.user.id);
  ApiResponse.success(res, { apiKeys });
});

exports.getApiKeyById = asyncHandler(async (req, res) => {
  const apiKey = await apiKeyService.getApiKeyById(req.user.id, req.params.id);
  ApiResponse.success(res, { apiKey });
});

exports.createApiKey = asyncHandler(async (req, res) => {
  const apiKey = await apiKeyService.createApiKey(req.user.id, req.body);
  ApiResponse.created(res, { apiKey }, 'API key created. Save the secret - it will not be shown again!');
});

exports.updateApiKey = asyncHandler(async (req, res) => {
  const apiKey = await apiKeyService.updateApiKey(req.user.id, req.params.id, req.body);
  ApiResponse.success(res, { apiKey }, 'API key updated');
});

exports.deleteApiKey = asyncHandler(async (req, res) => {
  await apiKeyService.deleteApiKey(req.user.id, req.params.id);
  ApiResponse.success(res, null, 'API key revoked');
});

exports.getKeyStats = asyncHandler(async (req, res) => {
  const stats = await apiKeyService.getKeyStats(req.user.id, req.params.id);
  ApiResponse.success(res, { statistics: stats });
});

exports.revokeAllApiKeys = asyncHandler(async (req, res) => {
  const apiKeys = await apiKeyService.getApiKeys(req.user.id);
  let revoked = 0;
  for (const key of apiKeys) {
    if (key.status === 'active') {
      await apiKeyService.deleteApiKey(req.user.id, key.id);
      revoked++;
    }
  }
  ApiResponse.success(res, { revoked }, 'All API keys revoked');
});
