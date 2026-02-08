const alertService = require('../services/alertService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getAlerts = asyncHandler(async (req, res) => {
  const result = await alertService.getAlerts(req.user.id, req.query);
  ApiResponse.paginated(res, result.alerts, result.pagination);
});

exports.getAlertById = asyncHandler(async (req, res) => {
  const alert = await alertService.getAlertById(req.user.id, req.params.id);
  ApiResponse.success(res, { alert });
});

exports.createAlert = asyncHandler(async (req, res) => {
  const alert = await alertService.createAlert(req.user.id, req.body);
  ApiResponse.created(res, { alert }, 'Alert created successfully');
});

exports.updateAlert = asyncHandler(async (req, res) => {
  const alert = await alertService.updateAlert(req.user.id, req.params.id, req.body);
  ApiResponse.success(res, { alert }, 'Alert updated successfully');
});

exports.deleteAlert = asyncHandler(async (req, res) => {
  await alertService.deleteAlert(req.user.id, req.params.id);
  ApiResponse.success(res, null, 'Alert deleted');
});

exports.toggleAlert = asyncHandler(async (req, res) => {
  const alert = await alertService.toggleAlert(req.user.id, req.params.id);
  ApiResponse.success(res, { alert }, 'Alert status toggled');
});

exports.getStatistics = asyncHandler(async (req, res) => {
  const stats = await alertService.getStatistics(req.user.id);
  ApiResponse.success(res, { statistics: stats });
});
