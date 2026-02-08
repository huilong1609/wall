const userService = require('../services/userService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');
const { User } = require('../models');
const { generateUniqueUsernameRandom } = require('../utils/helpers');

exports.register = asyncHandler(async (req, res) => {

  const { email, pin, confirm_pin, firstName, lastName, referralCode } = req.body;

  const ip = req.ip || req.connection.remoteAddress;
  const device = req.headers['user-agent'];
  const username = generateUniqueUsernameRandom(email)

  const result = await userService.register(
    { email, pin,confirm_pin, username, firstName, lastName, referralCode },
    ip,
    device
  );

  ApiResponse.created(res, {
    user: result.user,
    message: 'Registration successful. Please check your email to verify your account.',
  });
});

exports.registerNew = asyncHandler(async (req, res) => {

  const {firstName, lastName, email, phone,country, currency, password, confirmPassword, pin, confirmPin, referralCode } = req.body;

  const ip = req.ip || req.connection.remoteAddress;
  const device = req.headers['user-agent'];
  const username = generateUniqueUsernameRandom(email)

  const result = await userService.registerNew(
    { firstName, lastName, email, username, phone, country, currency, password, confirmPassword, pin, confirmPin, referralCode },
    ip,
    device
  );

  ApiResponse.created(res, {
    //user: result.user,
    result: result,
    message: 'Registration successful. Please check your email to verify your account.',
  });
});

exports.start = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const device = req.headers['user-agent'];

  const result = await userService.start(
    { email },
    ip,
    device
  );


  ApiResponse.created(res, {
    registered: result.registered,
    code: result.code,
    message: result.registered ? 'User Exists' : 'User Does Not Exist'
  });
})


exports.verifyOTP = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  console.log('Verify OTP Request:', req.body);

  const result = await userService.verifyOTP({ email, code });

  ApiResponse.success(res, {
    validate: result.status,
    message: result.registered ? 'User Exists' : 'User Does Not Exist',
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password, twoFactorCode } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const device = req.headers['user-agent'];

  const result = await userService.login(email, password, ip, device, twoFactorCode);

  if (result.requires2FA) {
    return ApiResponse.success(res, { requires2FA: true, message: 'Please enter your 2FA code' });
  }

  ApiResponse.success(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  }, 'Login successful');
});

exports.loginWithPin = asyncHandler(async (req, res) => {
  const { email, pin, twoFactorCode } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const device = req.headers['user-agent'];

  const result = await userService.loginWithPin(email, pin, ip, device, twoFactorCode);

  if (result.requires2FA) {
    return ApiResponse.success(res, { requires2FA: true, message: 'Please enter your 2FA code' });
  }

  ApiResponse.success(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  }, 'Login successful');
});

exports.logout = asyncHandler(async (req, res) => {
  await userService.logout(req.sessionId);
  ApiResponse.success(res, null, 'Logout successful');
});

exports.logoutAll = asyncHandler(async (req, res) => {
  await userService.logoutAll(req.user.id);
  ApiResponse.success(res, null, 'Logged out from all devices');
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await userService.refreshToken(refreshToken);
  ApiResponse.success(res, result, 'Token refreshed');
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  await userService.verifyEmail(token);
  ApiResponse.success(res, null, 'Email verified successfully');
});

exports.resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await userService.resendVerification(email);
  ApiResponse.success(res, null, 'Verification email sent');
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await userService.forgotPassword(email);
  ApiResponse.success(res, null, 'If an account exists, a reset email will be sent');
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  await userService.resetPassword(token, password);
  ApiResponse.success(res, null, 'Password reset successful');
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, password } = req.body;
  await userService.changePassword(req.user.id, currentPassword, password);
  ApiResponse.success(res, null, 'Password changed successfully');
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.user.id);
  ApiResponse.success(res, { user });
});

exports.setup2FA = asyncHandler(async (req, res) => {
  const result = await userService.setup2FA(req.user.id);
  ApiResponse.success(res, result, '2FA setup initiated');
});

exports.enable2FA = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const result = await userService.enable2FA(req.user.id, code);
  ApiResponse.success(res, result, '2FA enabled successfully');
});

exports.disable2FA = asyncHandler(async (req, res) => {
  const { code } = req.body;
  await userService.disable2FA(req.user.id, code);
  ApiResponse.success(res, null, '2FA disabled successfully');
});

exports.verify2FA = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const isValid = await userService.verify2FACode(req.user.id, code);
  if (!isValid) {
    return ApiResponse.error(res, 'Invalid 2FA code', 400);
  }
  ApiResponse.success(res, { verified: true }, '2FA verified');
});

exports.getBackupCodes = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.user.id);
  ApiResponse.success(res, { backupCodes: user.backupCodes || [] });
});

exports.regenerateBackupCodes = asyncHandler(async (req, res) => {
  ApiResponse.success(res, null, 'Backup codes regenerated');
});
