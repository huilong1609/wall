const walletService = require('../services/walletService');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getWallets = asyncHandler(async (req, res) => {
  const wallets = await walletService.getWallets(req.user.id);
  ApiResponse.success(res, { wallets });
});

exports.getOverview = asyncHandler(async (req, res) => {
  const overview = await walletService.getOverview(req.user.id);
  ApiResponse.success(res, overview);
});

exports.getDeposit = asyncHandler(async (req, res) => {
  const deposit = await walletService.getDeposit(req.user.id);
  ApiResponse.success(res, deposit);
});

exports.getWithdrawal = asyncHandler(async (req, res) => {
  const withdrawal = await walletService.getWithdrawal(req.user.id);
  ApiResponse.success(res, withdrawal);
});

exports.getWalletByType = asyncHandler(async (req, res) => {
  const wallets = await walletService.getWalletsByType(req.user.id, req.params.type);
  ApiResponse.success(res, { wallets });
});

exports.getBalance = asyncHandler(async (req, res) => {
  const balance = await walletService.getBalance(req.user.id, req.params.type, req.params.currency);
  ApiResponse.success(res, { balance });
});

exports.getDepositAddress = asyncHandler(async (req, res) => {
  const { symbol, network } = req.body;
  const address = await walletService.getDepositAddress(req.user.id, req.body);
  ApiResponse.success(res, { address });
});

exports.getDepositHistory = asyncHandler(async (req, res) => {
  const result = await walletService.getDepositHistory(req.user.id, req.query);
  ApiResponse.paginated(res, result.deposits, result.pagination);
});

exports.requestWithdrawal = asyncHandler(async (req, res) => {
  const transaction = await walletService.requestWithdrawal(req.user.id, req.body);
  ApiResponse.created(res, { transaction }, 'Withdrawal request submitted');
});

exports.getWithdrawalHistory = asyncHandler(async (req, res) => {
  const result = await walletService.getWithdrawalHistory(req.user.id, req.query);
  ApiResponse.paginated(res, result.withdrawals, result.pagination);
});

exports.cancelWithdrawal = asyncHandler(async (req, res) => {
  const transaction = await walletService.cancelWithdrawal(req.user.id, req.params.id);
  ApiResponse.success(res, { transaction }, 'Withdrawal cancelled');
});

exports.transferBetweenWallets = asyncHandler(async (req, res) => {
  const { from, to, currency, amount } = req.body;
  const result = await walletService.transfer(req.user.id, from, to, currency, amount);
  ApiResponse.success(res, result, 'Transfer completed');
});

exports.getTransferHistory = asyncHandler(async (req, res) => {
  const result = await walletService.getTransferHistory(req.user.id, req.query.page, req.query.limit);
  ApiResponse.paginated(res, result.transfers, result.pagination);
});

exports.getTransactions = asyncHandler(async (req, res) => {
  const result = await walletService.getTransactions(req.user.id, req.query);
  ApiResponse.success(res, result);
  //ApiResponse.paginated(res, result, result.pagination);
});

exports.getTransactionById = asyncHandler(async (req, res) => {
  const transaction = await walletService.getTransactionById(req.user.id, req.params.id);
  ApiResponse.success(res, { transaction });
});

exports.getWhitelistAddresses = asyncHandler(async (req, res) => {
  ApiResponse.success(res, { addresses: [] });
});

exports.addWhitelistAddress = asyncHandler(async (req, res) => {
  ApiResponse.created(res, null, 'Address added to whitelist');
});

exports.removeWhitelistAddress = asyncHandler(async (req, res) => {
  ApiResponse.success(res, null, 'Address removed from whitelist');
});
