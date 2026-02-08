const notificationService = require('../services/notificationService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getNotifications(req.user.id, req.query);
  ApiResponse.paginated(res,  { notifications: result.notifications , unreadCount: result.unreadCount , totalCount: result.totalCount }, result.pagination);
});

exports.getNotificationById = asyncHandler(async (req, res) => {
  const notification = await notificationService.getNotificationById(req.user.id, req.params.id);
  ApiResponse.success(res, { notification });
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  ApiResponse.success(res, { unreadCount: count });
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.user.id, req.params.id);
  ApiResponse.success(res, { notification }, 'Notification marked as read');
});

exports.markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  ApiResponse.success(res, result, 'All notifications marked as read');
});

exports.deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.user.id, req.params.id);
  ApiResponse.success(res, null, 'Notification deleted');
});

exports.deleteAllNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.deleteAllNotifications(req.user.id);
  ApiResponse.success(res, result, 'All notifications deleted');
});

exports.createNotification = asyncHandler(async (req,res) => {
  const result = await notificationService.createNotification(req.user.id , req.body);
  ApiResponse.success(res, result, 'Notification created')
})