const supportService = require('../services/supportService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getTickets = asyncHandler(async (req, res) => {
  const result = await supportService.getTickets(req.user.id, req.query);
  ApiResponse.paginated(res, result.tickets, result.pagination);
});

exports.getTicketById = asyncHandler(async (req, res) => {
  const ticket = await supportService.getTicketById(req.user.id, req.params.id);
  ApiResponse.success(res, { ticket });
});

exports.createTicket = asyncHandler(async (req, res) => {
  const ticket = await supportService.createTicket(req.user.id, req.body);
  ApiResponse.created(res, { ticket }, 'Ticket created successfully');
});

exports.replyToTicket = asyncHandler(async (req, res) => {
  const { message, attachments } = req.body;
  const ticketMessage = await supportService.replyToTicket(req.user.id, req.params.id, message, attachments);
  ApiResponse.created(res, { message: ticketMessage }, 'Reply sent successfully');
});

exports.closeTicket = asyncHandler(async (req, res) => {
  const ticket = await supportService.closeTicket(req.user.id, req.params.id);
  ApiResponse.success(res, { ticket }, 'Ticket closed successfully');
});

exports.reopenTicket = asyncHandler(async (req, res) => {
  const ticket = await supportService.reopenTicket(req.user.id, req.params.id);
  ApiResponse.success(res, { ticket }, 'Ticket reopened successfully');
});

exports.rateTicket = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const ticket = await supportService.rateTicket(req.user.id, req.params.id, rating, comment);
  ApiResponse.success(res, { ticket }, 'Thank you for your feedback');
});

exports.getFAQCategories = asyncHandler(async (req, res) => {
  const categories = await supportService.getFAQCategories();
  ApiResponse.success(res, { categories });
});

exports.searchFAQ = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const faqs = await supportService.searchFAQ(q);
  ApiResponse.success(res, { faqs });
});

exports.getTicketStats = asyncHandler(async (req, res) => {
  const stats = await supportService.getTicketStats(req.user.id);
  ApiResponse.success(res, { statistics: stats });
});
