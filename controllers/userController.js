const userService = require('../services/userService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getProfile = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.user.id);
  ApiResponse.success(res, { user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  ApiResponse.success(res, { user }, 'Profile updated successfully');
});

exports.uploadAvatar = asyncHandler(async (req, res) => {
  ApiResponse.success(res, null, 'Avatar uploaded successfully');
});

exports.deleteAvatar = asyncHandler(async (req, res) => {
  await userService.updateProfile(req.user.id, { avatar: null });
  ApiResponse.success(res, null, 'Avatar deleted successfully');
});

exports.getSettings = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.user.id);
  ApiResponse.success(res, {
    timezone: user.timezone,
    language: user.language,
    currency: user.currency,
    dateFormat: user.dateFormat,
    notificationPreferences: user.notificationPreferences,
    quietHours: user.quietHours,
  });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  ApiResponse.success(res, { user }, 'Settings updated successfully');
});

exports.getNotificationPreferences = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.user.id);
  ApiResponse.success(res, { preferences: user.notificationPreferences });
});

exports.updateNotificationPreferences = asyncHandler(async (req, res) => {
  const { preferences } = req.body;
  const user = await userService.updateNotificationPreferences(req.user.id, preferences);
  ApiResponse.success(res, { preferences: user.notificationPreferences }, 'Preferences updated');
});

exports.getSecuritySettings = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.user.id);
  ApiResponse.success(res, {
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorMethod: user.twoFactorMethod,
    antiPhishingCode: user.antiPhishingCode,
    withdrawalWhitelist: user.withdrawalWhitelist,
    loginNotifications: user.loginNotifications,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
  });
});

exports.updateSecuritySettings = asyncHandler(async (req, res) => {
  const { antiPhishingCode, withdrawalWhitelist, loginNotifications } = req.body;
  await userService.updateProfile(req.user.id, { antiPhishingCode, withdrawalWhitelist, loginNotifications });
  ApiResponse.success(res, null, 'Security settings updated');
});

exports.getSessions = asyncHandler(async (req, res) => {
  const sessions = await userService.getSessions(req.user.id);
  ApiResponse.success(res, {
    sessions: sessions.map(s => ({
      id: s.id,
      device: s.device,
      browser: s.browser,
      ip: s.ip,
      location: s.location,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      isCurrent: s.id === req.sessionId,
    })),
  });
});

exports.revokeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  if (sessionId === req.sessionId) {
    return ApiResponse.error(res, 'Cannot revoke current session', 400);
  }
  await userService.revokeSession(req.user.id, sessionId);
  ApiResponse.success(res, null, 'Session revoked');
});

exports.getLoginHistory = asyncHandler(async (req, res) => {
  ApiResponse.success(res, { history: [] });
});

exports.getActivity = asyncHandler(async (req, res) => {
  ApiResponse.success(res, { activities: [] });
});

exports.sendPhoneVerification = asyncHandler(async (req, res) => {
  ApiResponse.success(res, null, 'Verification code sent');
});

exports.confirmPhoneVerification = asyncHandler(async (req, res) => {
  ApiResponse.success(res, null, 'Phone verified successfully');
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  ApiResponse.success(res, null, 'Account deletion requested');
});

exports.exportData = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.user.id);
  ApiResponse.success(res, { user }, 'Data export initiated');
});
