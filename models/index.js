const { sequelize } = require('../config/database');

// Import model definitions
const UserModel = require('./User');
const UserBalanceModel = require('./UserBalance');
const WalletModel = require('./Wallet');
const WalletAddressModel = require('./WalletAddress');
const CoinModel = require('./Coin');
const NetworkModel = require('./Network');
const CoinNetworkModel = require('./CoinNetwork');
const NetworkAddressModel = require('./NetworkAddress');
const PlanModel = require('./Plan');
const UserPlanModel = require('./UserPlan');
const CouponModel = require('./Coupon');
const TransactionModel = require('./Transaction');
const OrderModel = require('./Order');
const TradeModel = require('./Trade');
const AssetModel = require('./Asset');
const AssetHoldingModel = require('./AssetHolding');
const AssetLotModel = require('./AssetLot');
const TradingPairModel = require('./TradingPair');
const NotificationModel = require('./Notification');
const TicketModel = require('./Ticket');
const { TicketMessageModel } = require('./Ticket');
const StakingModels = require('./Staking');
const ReferralModels = require('./Referral');
const PriceAlertModel = require('./PriceAlert');
const CopyTradingModels = require('./CopyTrading');
const EmailOTPModels = require('./EmailOTP');
const { SessionModel, ApiKeyModel } = require('./Session');
//const BotModel = require('./Bot');
const BotMarketplaceModel = require('./BotMarketplace');
const BotSubscriptionModel = require('./BotSubscription');
const SignalModel = require('./Signal');
const SignalProviderModel = require('./SignalProvider');
const SignalSubscriptionModel = require('./SignalSubscription');


// Initialize models
const User = UserModel(sequelize);
const UserBalance = UserBalanceModel(sequelize);
const Wallet = WalletModel(sequelize);
const WalletAddress = WalletAddressModel(sequelize);
const Coin = CoinModel(sequelize);
const Network = NetworkModel(sequelize);
const CoinNetwork = CoinNetworkModel(sequelize);
const NetworkAddress = NetworkAddressModel(sequelize);
const Plan = PlanModel(sequelize);
const UserPlan = UserPlanModel(sequelize);
const Coupon = CouponModel(sequelize);
const Transaction = TransactionModel(sequelize);
const Order = OrderModel(sequelize);
const Trade = TradeModel(sequelize);
const Asset = AssetModel(sequelize);
const AssetHolding = AssetHoldingModel(sequelize);
const AssetLot = AssetLotModel(sequelize);
const TradingPair = TradingPairModel(sequelize);
const Notification = NotificationModel(sequelize);
const Ticket = TicketModel(sequelize);
const TicketMessage = TicketMessageModel(sequelize);
const { StakingPool, StakingPosition } = StakingModels(sequelize);
const { Referral, ReferralEarning } = ReferralModels(sequelize);
const PriceAlert = PriceAlertModel(sequelize);
const { TraderProfile, CopyRelation } = CopyTradingModels(sequelize);
const Session = SessionModel(sequelize);
const EmailOTP = EmailOTPModels(sequelize);
const ApiKey = ApiKeyModel(sequelize);
//const Bot = BotModel(sequelize);
const BotMarketplace = BotMarketplaceModel(sequelize);
const BotSubscription = BotSubscriptionModel(sequelize);
const SignalProvider = SignalProviderModel(sequelize);
const SignalSubscription = SignalSubscriptionModel(sequelize);
const Signal = SignalModel(sequelize);





// Define Associations

// User associations
User.hasMany(Wallet, { foreignKey: 'userId', as: 'wallets' });
User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
User.hasMany(Trade, { foreignKey: 'userId', as: 'trades' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
User.hasMany(Ticket, { foreignKey: 'userId', as: 'tickets' });
User.hasMany(StakingPosition, { foreignKey: 'userId', as: 'stakingPositions' });
User.hasMany(PriceAlert, { foreignKey: 'userId', as: 'priceAlerts' });
User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });
User.hasMany(ApiKey, { foreignKey: 'userId', as: 'apiKeys' });
User.hasMany(AssetHolding, { foreignKey: 'userId', as: 'assetHolding' });
User.hasMany(AssetLot, { foreignKey: 'userId', as: 'assetLot' });
User.hasOne(UserBalance, { foreignKey: 'userId', as: 'balance' });
User.hasMany(UserPlan, { foreignKey: 'userId', as: 'userPlan' });

// Self-referential for referrals
User.belongsTo(User, { foreignKey: 'referredById', as: 'referrer' });
User.hasMany(User, { foreignKey: 'referredById', as: 'referrals' });

// Trade associations
UserBalance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Self-referential for coinNetwork
CoinNetwork.belongsTo(Coin, { foreignKey: 'coin_id', as: 'coin' });
CoinNetwork.belongsTo(Network, { foreignKey: 'network_id', as: 'network' });
Coin.hasMany(CoinNetwork, { foreignKey: 'coin_id', as: 'coinNetwork' });
Network.hasMany(CoinNetwork, { foreignKey: 'network_id', as: 'coinNetwork' });

//Asset associations
Asset.hasOne(AssetHolding , {foreignKey: 'assetId' , as: 'holdings'})
AssetHolding.belongsTo(User, { foreignKey: 'userId', as: 'user' });
AssetHolding.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });
AssetLot.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Coin associations
User.hasOne(Wallet, { foreignKey: 'coinId', as: 'wallet' });

//Plan
UserPlan.belongsTo(User, { foreignKey: 'userId', as: 'user' });
UserPlan.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });
Plan.hasMany(UserPlan, { foreignKey: 'planId', as: 'userPlan' });
// Wallet associations
Wallet.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Wallet.belongsTo(Coin, { foreignKey: 'coinId', as: 'coin' });
Wallet.hasMany(Transaction, { foreignKey: 'walletId', as: 'transactions' });

// Transaction associations
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Transaction.belongsTo(Wallet, { foreignKey: 'walletId', as: 'wallet' });
Transaction.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// Order associations
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Order.hasMany(Trade, { foreignKey: 'orderId', as: 'trades' });
Order.hasMany(Transaction, { foreignKey: 'orderId', as: 'transactions' });

// Trade associations
Trade.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Trade.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Ticket associations
Ticket.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Ticket.hasMany(TicketMessage, { foreignKey: 'ticketId', as: 'messages' });
TicketMessage.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });

// Staking associations
StakingPool.hasMany(StakingPosition, { foreignKey: 'poolId', as: 'positions' });
StakingPosition.belongsTo(User, { foreignKey: 'userId', as: 'user' });
StakingPosition.belongsTo(StakingPool, { foreignKey: 'poolId', as: 'pool' });

// Referral associations
Referral.belongsTo(User, { foreignKey: 'referrerId', as: 'referrer' });
Referral.belongsTo(User, { foreignKey: 'referredId', as: 'referred' });
Referral.hasMany(ReferralEarning, { foreignKey: 'referralId', as: 'earnings' });
ReferralEarning.belongsTo(Referral, { foreignKey: 'referralId', as: 'referral' });

// Price Alert associations
PriceAlert.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Copy Trading associations
TraderProfile.hasMany(CopyRelation, { foreignKey: 'traderProfileId', as: 'copiers' });
CopyRelation.belongsTo(User, { foreignKey: 'copierId', as: 'copier' });
CopyRelation.belongsTo(TraderProfile, { foreignKey: 'traderId', as: 'trader' });
CopyRelation.belongsTo(TraderProfile, { foreignKey: 'traderProfileId', as: 'traderProfile' });

// Session associations
Session.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// API Key associations
ApiKey.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Bot Marketplace associations
BotMarketplace.hasMany(BotSubscription, { foreignKey: 'botMarketplaceId', as: 'subscriptions' });

// Bot Subscription associations
User.hasMany(BotSubscription, { foreignKey: 'userId', as: 'botSubscriptions' });
BotSubscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });
BotSubscription.belongsTo(BotMarketplace, { foreignKey: 'botMarketplaceId', as: 'bot' });

/* // Bot associations
User.hasMany(Bot, { foreignKey: 'userId', as: 'bots' });
Bot.belongsTo(User, { foreignKey: 'userId', as: 'user' });



 */

// Signal Provider associations
User.hasMany(SignalProvider, { foreignKey: 'userId', as: 'signalProviders' });
SignalProvider.belongsTo(User, { foreignKey: 'userId', as: 'user' });
SignalProvider.hasMany(Signal, { foreignKey: 'providerId', as: 'signals' });
SignalProvider.hasMany(SignalSubscription, { foreignKey: 'providerId', as: 'subscriptions' });

// Signal associations
Signal.belongsTo(SignalProvider, { foreignKey: 'providerId', as: 'provider' });

// Signal Subscription associations
User.hasMany(SignalSubscription, { foreignKey: 'userId', as: 'signalSubscriptions' });
SignalSubscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });
SignalSubscription.belongsTo(SignalProvider, { foreignKey: 'providerId', as: 'provider' });


// Export models
module.exports = {
  sequelize,
  User,
  UserBalance,
  Coin,
  Network,
  CoinNetwork,
  NetworkAddress,
  Wallet,
  WalletAddress,
  Plan,
  UserPlan,
  Coupon,
  BotMarketplace,
  BotSubscription,
  Signal,
  SignalProvider,
  SignalSubscription,
  Transaction,
  Order,
  Trade,
  Asset,
  AssetHolding,
  TradingPair,
  Notification,
  Ticket,
  TicketMessage,
  StakingPool,
  StakingPosition,
  Referral,
  ReferralEarning,
  PriceAlert,
  TraderProfile,
  CopyRelation,
  Session,
  ApiKey,
  EmailOTP,
  //Bot,
  
};
