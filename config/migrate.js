/**
 * ============================================
 * DATABASE MIGRATION SCRIPT
 * ============================================
 * Creates all required tables for the crypto trading platform
 */

require('dotenv').config();
const { pool } = require('../config/database');
const logger = require('../config/logger');

const migrations = [
  // ============================================
  // EXTENSIONS
  // ============================================
  {
    name: 'Enable UUID extension',
    up: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
    down: `DROP EXTENSION IF EXISTS "uuid-ossp";`,
  },

  // ============================================
  // USERS & AUTHENTICATION
  // ============================================
  {
    name: 'Create users table',
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        country VARCHAR(100),
        city VARCHAR(100),
        timezone VARCHAR(50) DEFAULT 'UTC',
        language VARCHAR(10) DEFAULT 'en',
        currency VARCHAR(10) DEFAULT 'USD',
        date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
        bio TEXT,
        avatar_url VARCHAR(500),
        
        -- Verification status
        email_verified BOOLEAN DEFAULT FALSE,
        email_verified_at TIMESTAMP WITH TIME ZONE,
        phone_verified BOOLEAN DEFAULT FALSE,
        phone_verified_at TIMESTAMP WITH TIME ZONE,
        kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'rejected')),
        kyc_verified_at TIMESTAMP WITH TIME ZONE,
        
        -- Account status
        account_type VARCHAR(20) DEFAULT 'standard' CHECK (account_type IN ('standard', 'premium', 'vip', 'institutional')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'banned')),
        is_admin BOOLEAN DEFAULT FALSE,
        
        -- Security
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_secret VARCHAR(255),
        anti_phishing_code VARCHAR(20),
        login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP WITH TIME ZONE,
        last_login_at TIMESTAMP WITH TIME ZONE,
        last_login_ip VARCHAR(45),
        
        -- Referral
        referral_code VARCHAR(20) UNIQUE,
        referred_by UUID REFERENCES users(id),
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_username ON users(username);
      CREATE INDEX idx_users_referral_code ON users(referral_code);
    `,
    down: `DROP TABLE IF EXISTS users CASCADE;`,
  },

  {
    name: 'Create refresh_tokens table',
    up: `
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        device_info JSONB,
        ip_address VARCHAR(45),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        revoked_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
    `,
    down: `DROP TABLE IF EXISTS refresh_tokens CASCADE;`,
  },

  {
    name: 'Create verification_tokens table',
    up: `
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'phone', 'password_reset', '2fa_setup')),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_verification_tokens_user_id ON verification_tokens(user_id);
      CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
    `,
    down: `DROP TABLE IF EXISTS verification_tokens CASCADE;`,
  },

  {
    name: 'Create login_history table',
    up: `
      CREATE TABLE IF NOT EXISTS login_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ip_address VARCHAR(45),
        user_agent TEXT,
        device_type VARCHAR(50),
        location JSONB,
        status VARCHAR(20) CHECK (status IN ('success', 'failed', 'blocked')),
        failure_reason VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_login_history_user_id ON login_history(user_id);
      CREATE INDEX idx_login_history_created_at ON login_history(created_at);
    `,
    down: `DROP TABLE IF EXISTS login_history CASCADE;`,
  },

  // ============================================
  // CRYPTOCURRENCIES & ASSETS
  // ============================================
  {
    name: 'Create cryptocurrencies table',
    up: `
      CREATE TABLE IF NOT EXISTS cryptocurrencies (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        symbol VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        icon_url VARCHAR(500),
        color VARCHAR(7),
        
        -- Market data
        current_price DECIMAL(30, 10) DEFAULT 0,
        price_change_24h DECIMAL(10, 4) DEFAULT 0,
        price_change_7d DECIMAL(10, 4) DEFAULT 0,
        market_cap DECIMAL(30, 2) DEFAULT 0,
        volume_24h DECIMAL(30, 2) DEFAULT 0,
        circulating_supply DECIMAL(30, 8) DEFAULT 0,
        total_supply DECIMAL(30, 8),
        max_supply DECIMAL(30, 8),
        ath DECIMAL(30, 10),
        ath_date TIMESTAMP WITH TIME ZONE,
        atl DECIMAL(30, 10),
        atl_date TIMESTAMP WITH TIME ZONE,
        
        -- Metadata
        category VARCHAR(50) CHECK (category IN ('l1', 'l2', 'defi', 'nft', 'meme', 'stablecoin', 'other')),
        description TEXT,
        website_url VARCHAR(500),
        whitepaper_url VARCHAR(500),
        github_url VARCHAR(500),
        twitter_url VARCHAR(500),
        
        -- Trading info
        is_tradable BOOLEAN DEFAULT TRUE,
        is_stakeable BOOLEAN DEFAULT FALSE,
        min_trade_amount DECIMAL(30, 10) DEFAULT 0,
        trade_fee_percent DECIMAL(5, 4) DEFAULT 0.001,
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'delisted')),
        rank INTEGER,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_cryptocurrencies_symbol ON cryptocurrencies(symbol);
      CREATE INDEX idx_cryptocurrencies_rank ON cryptocurrencies(rank);
    `,
    down: `DROP TABLE IF EXISTS cryptocurrencies CASCADE;`,
  },

  {
    name: 'Create trading_pairs table',
    up: `
      CREATE TABLE IF NOT EXISTS trading_pairs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        base_currency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
        quote_currency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
        symbol VARCHAR(30) UNIQUE NOT NULL,
        
        -- Trading config
        min_order_size DECIMAL(30, 10) DEFAULT 0,
        max_order_size DECIMAL(30, 10),
        price_precision INTEGER DEFAULT 8,
        quantity_precision INTEGER DEFAULT 8,
        tick_size DECIMAL(20, 10) DEFAULT 0.00000001,
        
        -- Fees
        maker_fee DECIMAL(5, 4) DEFAULT 0.001,
        taker_fee DECIMAL(5, 4) DEFAULT 0.001,
        
        -- Market data
        last_price DECIMAL(30, 10) DEFAULT 0,
        bid_price DECIMAL(30, 10) DEFAULT 0,
        ask_price DECIMAL(30, 10) DEFAULT 0,
        high_24h DECIMAL(30, 10) DEFAULT 0,
        low_24h DECIMAL(30, 10) DEFAULT 0,
        volume_24h DECIMAL(30, 10) DEFAULT 0,
        price_change_24h DECIMAL(10, 4) DEFAULT 0,
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
        pair_type VARCHAR(20) DEFAULT 'spot' CHECK (pair_type IN ('spot', 'futures', 'margin')),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(base_currency_id, quote_currency_id)
      );
      
      CREATE INDEX idx_trading_pairs_symbol ON trading_pairs(symbol);
    `,
    down: `DROP TABLE IF EXISTS trading_pairs CASCADE;`,
  },

  // ============================================
  // WALLETS & BALANCES
  // ============================================
  {
    name: 'Create wallets table',
    up: `
      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cryptocurrency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
        
        -- Balances
        balance DECIMAL(30, 10) DEFAULT 0,
        available_balance DECIMAL(30, 10) DEFAULT 0,
        locked_balance DECIMAL(30, 10) DEFAULT 0,
        staked_balance DECIMAL(30, 10) DEFAULT 0,
        
        -- Wallet addresses (for deposits)
        deposit_address VARCHAR(255),
        deposit_memo VARCHAR(100),
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'suspended')),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(user_id, cryptocurrency_id)
      );
      
      CREATE INDEX idx_wallets_user_id ON wallets(user_id);
    `,
    down: `DROP TABLE IF EXISTS wallets CASCADE;`,
  },

  {
    name: 'Create transactions table',
    up: `
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        wallet_id UUID NOT NULL REFERENCES wallets(id),
        cryptocurrency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
        
        -- Transaction details
        type VARCHAR(30) NOT NULL CHECK (type IN ('deposit', 'withdraw', 'transfer_in', 'transfer_out', 'trade_buy', 'trade_sell', 'stake', 'unstake', 'reward', 'fee', 'refund', 'airdrop')),
        amount DECIMAL(30, 10) NOT NULL,
        fee DECIMAL(30, 10) DEFAULT 0,
        net_amount DECIMAL(30, 10),
        
        -- For deposits/withdrawals
        tx_hash VARCHAR(255),
        from_address VARCHAR(255),
        to_address VARCHAR(255),
        network VARCHAR(50),
        confirmations INTEGER DEFAULT 0,
        required_confirmations INTEGER DEFAULT 1,
        
        -- For transfers between wallets
        from_wallet_type VARCHAR(20),
        to_wallet_type VARCHAR(20),
        
        -- Reference
        reference_id UUID,
        reference_type VARCHAR(50),
        
        -- Status
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
        failure_reason TEXT,
        
        -- Admin
        reviewed_by UUID REFERENCES users(id),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      );
      
      CREATE INDEX idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
      CREATE INDEX idx_transactions_type ON transactions(type);
      CREATE INDEX idx_transactions_status ON transactions(status);
      CREATE INDEX idx_transactions_created_at ON transactions(created_at);
    `,
    down: `DROP TABLE IF EXISTS transactions CASCADE;`,
  },

  // ============================================
  // ORDERS & TRADES
  // ============================================
  {
    name: 'Create orders table',
    up: `
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trading_pair_id UUID NOT NULL REFERENCES trading_pairs(id),
        
        -- Order details
        side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
        type VARCHAR(20) NOT NULL CHECK (type IN ('market', 'limit', 'stop_limit', 'stop_market', 'trailing_stop')),
        
        -- Prices
        price DECIMAL(30, 10),
        stop_price DECIMAL(30, 10),
        trailing_delta DECIMAL(10, 4),
        
        -- Quantities
        quantity DECIMAL(30, 10) NOT NULL,
        filled_quantity DECIMAL(30, 10) DEFAULT 0,
        remaining_quantity DECIMAL(30, 10),
        
        -- Values
        quote_quantity DECIMAL(30, 10),
        filled_quote_quantity DECIMAL(30, 10) DEFAULT 0,
        average_price DECIMAL(30, 10),
        
        -- Fees
        fee DECIMAL(30, 10) DEFAULT 0,
        fee_currency VARCHAR(20),
        
        -- Options
        time_in_force VARCHAR(10) DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK', 'GTD')),
        expire_at TIMESTAMP WITH TIME ZONE,
        post_only BOOLEAN DEFAULT FALSE,
        reduce_only BOOLEAN DEFAULT FALSE,
        
        -- Status
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired')),
        cancel_reason TEXT,
        
        -- Client reference
        client_order_id VARCHAR(100),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        filled_at TIMESTAMP WITH TIME ZONE
      );
      
      CREATE INDEX idx_orders_user_id ON orders(user_id);
      CREATE INDEX idx_orders_trading_pair_id ON orders(trading_pair_id);
      CREATE INDEX idx_orders_status ON orders(status);
      CREATE INDEX idx_orders_created_at ON orders(created_at);
    `,
    down: `DROP TABLE IF EXISTS orders CASCADE;`,
  },

  {
    name: 'Create trades table',
    up: `
      CREATE TABLE IF NOT EXISTS trades (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID NOT NULL REFERENCES orders(id),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trading_pair_id UUID NOT NULL REFERENCES trading_pairs(id),
        
        -- Trade details
        side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
        price DECIMAL(30, 10) NOT NULL,
        quantity DECIMAL(30, 10) NOT NULL,
        quote_quantity DECIMAL(30, 10) NOT NULL,
        
        -- Fees
        fee DECIMAL(30, 10) DEFAULT 0,
        fee_currency VARCHAR(20),
        is_maker BOOLEAN DEFAULT FALSE,
        
        -- Counterparty
        counter_order_id UUID REFERENCES orders(id),
        counter_user_id UUID REFERENCES users(id),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_trades_order_id ON trades(order_id);
      CREATE INDEX idx_trades_user_id ON trades(user_id);
      CREATE INDEX idx_trades_trading_pair_id ON trades(trading_pair_id);
      CREATE INDEX idx_trades_created_at ON trades(created_at);
    `,
    down: `DROP TABLE IF EXISTS trades CASCADE;`,
  },

  // ============================================
  // STAKING & EARN
  // ============================================
  {
    name: 'Create staking_pools table',
    up: `
      CREATE TABLE IF NOT EXISTS staking_pools (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cryptocurrency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        
        -- APY/APR
        apy DECIMAL(10, 4) NOT NULL,
        min_apy DECIMAL(10, 4),
        max_apy DECIMAL(10, 4),
        
        -- Staking conditions
        min_stake DECIMAL(30, 10) DEFAULT 0,
        max_stake DECIMAL(30, 10),
        lock_period_days INTEGER DEFAULT 0,
        
        -- Pool stats
        total_staked DECIMAL(30, 10) DEFAULT 0,
        total_stakers INTEGER DEFAULT 0,
        pool_capacity DECIMAL(30, 10),
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed', 'full')),
        
        starts_at TIMESTAMP WITH TIME ZONE,
        ends_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
    down: `DROP TABLE IF EXISTS staking_pools CASCADE;`,
  },

  {
    name: 'Create user_stakes table',
    up: `
      CREATE TABLE IF NOT EXISTS user_stakes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        staking_pool_id UUID NOT NULL REFERENCES staking_pools(id),
        wallet_id UUID NOT NULL REFERENCES wallets(id),
        
        -- Stake details
        amount DECIMAL(30, 10) NOT NULL,
        apy_at_stake DECIMAL(10, 4) NOT NULL,
        
        -- Rewards
        rewards_earned DECIMAL(30, 10) DEFAULT 0,
        rewards_claimed DECIMAL(30, 10) DEFAULT 0,
        last_reward_at TIMESTAMP WITH TIME ZONE,
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'unstaking', 'completed', 'cancelled')),
        
        staked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        unlock_at TIMESTAMP WITH TIME ZONE,
        unstaked_at TIMESTAMP WITH TIME ZONE
      );
      
      CREATE INDEX idx_user_stakes_user_id ON user_stakes(user_id);
      CREATE INDEX idx_user_stakes_pool_id ON user_stakes(staking_pool_id);
    `,
    down: `DROP TABLE IF EXISTS user_stakes CASCADE;`,
  },

  {
    name: 'Create savings_products table',
    up: `
      CREATE TABLE IF NOT EXISTS savings_products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cryptocurrency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        
        -- Interest rates
        flexible_apy DECIMAL(10, 4),
        locked_30d_apy DECIMAL(10, 4),
        locked_60d_apy DECIMAL(10, 4),
        locked_90d_apy DECIMAL(10, 4),
        
        -- Limits
        min_subscription DECIMAL(30, 10) DEFAULT 0,
        max_subscription DECIMAL(30, 10),
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
    down: `DROP TABLE IF EXISTS savings_products CASCADE;`,
  },

  {
    name: 'Create user_savings table',
    up: `
      CREATE TABLE IF NOT EXISTS user_savings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        savings_product_id UUID NOT NULL REFERENCES savings_products(id),
        wallet_id UUID NOT NULL REFERENCES wallets(id),
        
        -- Subscription details
        amount DECIMAL(30, 10) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('flexible', 'locked_30d', 'locked_60d', 'locked_90d')),
        apy DECIMAL(10, 4) NOT NULL,
        
        -- Interest
        interest_earned DECIMAL(30, 10) DEFAULT 0,
        interest_paid DECIMAL(30, 10) DEFAULT 0,
        last_interest_at TIMESTAMP WITH TIME ZONE,
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'redeemed')),
        
        subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        matures_at TIMESTAMP WITH TIME ZONE,
        redeemed_at TIMESTAMP WITH TIME ZONE
      );
      
      CREATE INDEX idx_user_savings_user_id ON user_savings(user_id);
    `,
    down: `DROP TABLE IF EXISTS user_savings CASCADE;`,
  },

  // ============================================
  // WATCHLIST & ALERTS
  // ============================================
  {
    name: 'Create watchlists table',
    up: `
      CREATE TABLE IF NOT EXISTS watchlists (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cryptocurrency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(user_id, cryptocurrency_id)
      );
      
      CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);
    `,
    down: `DROP TABLE IF EXISTS watchlists CASCADE;`,
  },

  {
    name: 'Create price_alerts table',
    up: `
      CREATE TABLE IF NOT EXISTS price_alerts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cryptocurrency_id UUID NOT NULL REFERENCES cryptocurrencies(id),
        
        -- Alert conditions
        condition VARCHAR(20) NOT NULL CHECK (condition IN ('above', 'below', 'change_up', 'change_down')),
        target_price DECIMAL(30, 10),
        change_percent DECIMAL(10, 4),
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'cancelled', 'expired')),
        triggered_at TIMESTAMP WITH TIME ZONE,
        triggered_price DECIMAL(30, 10),
        
        -- Options
        is_recurring BOOLEAN DEFAULT FALSE,
        notify_email BOOLEAN DEFAULT TRUE,
        notify_push BOOLEAN DEFAULT TRUE,
        
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
      CREATE INDEX idx_price_alerts_status ON price_alerts(status);
    `,
    down: `DROP TABLE IF EXISTS price_alerts CASCADE;`,
  },

  // ============================================
  // REFERRALS
  // ============================================
  {
    name: 'Create referral_rewards table',
    up: `
      CREATE TABLE IF NOT EXISTS referral_rewards (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Reward details
        reward_type VARCHAR(30) NOT NULL CHECK (reward_type IN ('signup_bonus', 'trade_commission', 'deposit_bonus')),
        amount DECIMAL(30, 10) NOT NULL,
        currency VARCHAR(20) NOT NULL,
        
        -- Reference
        reference_id UUID,
        reference_type VARCHAR(50),
        
        -- Status
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'cancelled')),
        credited_at TIMESTAMP WITH TIME ZONE,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_referral_rewards_referrer_id ON referral_rewards(referrer_id);
      CREATE INDEX idx_referral_rewards_referred_id ON referral_rewards(referred_id);
    `,
    down: `DROP TABLE IF EXISTS referral_rewards CASCADE;`,
  },

  // ============================================
  // NOTIFICATIONS
  // ============================================
  {
    name: 'Create notifications table',
    up: `
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Notification content
        type VARCHAR(50) NOT NULL CHECK (type IN ('system', 'security', 'trade', 'deposit', 'withdrawal', 'staking', 'price_alert', 'referral', 'promotion')),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        
        -- Delivery
        channel VARCHAR(20) DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'push', 'sms')),
        
        -- Status
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP WITH TIME ZONE,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX idx_notifications_created_at ON notifications(created_at);
    `,
    down: `DROP TABLE IF EXISTS notifications CASCADE;`,
  },

  {
    name: 'Create notification_settings table',
    up: `
      CREATE TABLE IF NOT EXISTS notification_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Email notifications
        email_trade_confirmation BOOLEAN DEFAULT TRUE,
        email_deposit_confirmation BOOLEAN DEFAULT TRUE,
        email_withdrawal_confirmation BOOLEAN DEFAULT TRUE,
        email_login_alert BOOLEAN DEFAULT TRUE,
        email_price_alerts BOOLEAN DEFAULT TRUE,
        email_newsletter BOOLEAN DEFAULT TRUE,
        email_promotions BOOLEAN DEFAULT FALSE,
        
        -- Push notifications
        push_trade_confirmation BOOLEAN DEFAULT TRUE,
        push_deposit_confirmation BOOLEAN DEFAULT TRUE,
        push_withdrawal_confirmation BOOLEAN DEFAULT TRUE,
        push_login_alert BOOLEAN DEFAULT TRUE,
        push_price_alerts BOOLEAN DEFAULT TRUE,
        
        -- SMS notifications
        sms_withdrawal_confirmation BOOLEAN DEFAULT TRUE,
        sms_login_alert BOOLEAN DEFAULT TRUE,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
    down: `DROP TABLE IF EXISTS notification_settings CASCADE;`,
  },

  // ============================================
  // SUPPORT TICKETS
  // ============================================
  {
    name: 'Create support_tickets table',
    up: `
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Ticket details
        ticket_number VARCHAR(20) UNIQUE NOT NULL,
        subject VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL CHECK (category IN ('account', 'deposit', 'withdrawal', 'trading', 'technical', 'security', 'kyc', 'other')),
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        
        -- Status
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
        
        -- Assignment
        assigned_to UUID REFERENCES users(id),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        resolved_at TIMESTAMP WITH TIME ZONE,
        closed_at TIMESTAMP WITH TIME ZONE
      );
      
      CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
      CREATE INDEX idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX idx_support_tickets_ticket_number ON support_tickets(ticket_number);
    `,
    down: `DROP TABLE IF EXISTS support_tickets CASCADE;`,
  },

  {
    name: 'Create support_messages table',
    up: `
      CREATE TABLE IF NOT EXISTS support_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id),
        
        -- Message
        message TEXT NOT NULL,
        attachments JSONB,
        is_internal BOOLEAN DEFAULT FALSE,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_support_messages_ticket_id ON support_messages(ticket_id);
    `,
    down: `DROP TABLE IF EXISTS support_messages CASCADE;`,
  },

  // ============================================
  // API KEYS
  // ============================================
  {
    name: 'Create api_keys table',
    up: `
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Key details
        name VARCHAR(100) NOT NULL,
        api_key VARCHAR(255) UNIQUE NOT NULL,
        secret_hash VARCHAR(255) NOT NULL,
        
        -- Permissions
        permissions JSONB DEFAULT '{"read": true, "trade": false, "withdraw": false}'::jsonb,
        ip_whitelist TEXT[],
        
        -- Usage
        last_used_at TIMESTAMP WITH TIME ZONE,
        last_used_ip VARCHAR(45),
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'revoked')),
        expires_at TIMESTAMP WITH TIME ZONE,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
      CREATE INDEX idx_api_keys_api_key ON api_keys(api_key);
    `,
    down: `DROP TABLE IF EXISTS api_keys CASCADE;`,
  },

  // ============================================
  // COPY TRADING
  // ============================================
  {
    name: 'Create traders table',
    up: `
      CREATE TABLE IF NOT EXISTS traders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Profile
        display_name VARCHAR(100) NOT NULL,
        bio TEXT,
        avatar_url VARCHAR(500),
        
        -- Stats
        total_followers INTEGER DEFAULT 0,
        total_copiers INTEGER DEFAULT 0,
        total_profit DECIMAL(30, 10) DEFAULT 0,
        total_trades INTEGER DEFAULT 0,
        win_rate DECIMAL(5, 2) DEFAULT 0,
        avg_profit_per_trade DECIMAL(10, 4) DEFAULT 0,
        max_drawdown DECIMAL(5, 2) DEFAULT 0,
        sharpe_ratio DECIMAL(5, 2) DEFAULT 0,
        
        -- Copy trading settings
        min_copy_amount DECIMAL(30, 10) DEFAULT 100,
        max_copiers INTEGER DEFAULT 100,
        profit_share_percent DECIMAL(5, 2) DEFAULT 10,
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
        verified BOOLEAN DEFAULT FALSE,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_traders_user_id ON traders(user_id);
      CREATE INDEX idx_traders_win_rate ON traders(win_rate DESC);
    `,
    down: `DROP TABLE IF EXISTS traders CASCADE;`,
  },

  {
    name: 'Create copy_trades table',
    up: `
      CREATE TABLE IF NOT EXISTS copy_trades (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        copier_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trader_id UUID NOT NULL REFERENCES traders(id) ON DELETE CASCADE,
        
        -- Copy settings
        copy_amount DECIMAL(30, 10) NOT NULL,
        copy_percentage DECIMAL(5, 2) DEFAULT 100,
        max_position_size DECIMAL(30, 10),
        stop_loss_percent DECIMAL(5, 2),
        take_profit_percent DECIMAL(5, 2),
        
        -- Stats
        total_profit DECIMAL(30, 10) DEFAULT 0,
        total_trades INTEGER DEFAULT 0,
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
        
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        stopped_at TIMESTAMP WITH TIME ZONE
      );
      
      CREATE INDEX idx_copy_trades_copier_id ON copy_trades(copier_id);
      CREATE INDEX idx_copy_trades_trader_id ON copy_trades(trader_id);
    `,
    down: `DROP TABLE IF EXISTS copy_trades CASCADE;`,
  },

  // ============================================
  // TRADING BOTS
  // ============================================
  {
    name: 'Create trading_bots table',
    up: `
      CREATE TABLE IF NOT EXISTS trading_bots (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        
        -- Bot type
        type VARCHAR(30) NOT NULL CHECK (type IN ('grid', 'dca', 'arbitrage', 'market_making', 'signal', 'custom')),
        strategy JSONB,
        
        -- Stats
        total_users INTEGER DEFAULT 0,
        avg_monthly_return DECIMAL(10, 4) DEFAULT 0,
        risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')),
        
        -- Pricing
        is_free BOOLEAN DEFAULT FALSE,
        monthly_price DECIMAL(10, 2),
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
    down: `DROP TABLE IF EXISTS trading_bots CASCADE;`,
  },

  {
    name: 'Create user_bots table',
    up: `
      CREATE TABLE IF NOT EXISTS user_bots (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bot_id UUID NOT NULL REFERENCES trading_bots(id),
        
        -- Configuration
        settings JSONB,
        trading_pair_id UUID REFERENCES trading_pairs(id),
        investment_amount DECIMAL(30, 10),
        
        -- Stats
        total_profit DECIMAL(30, 10) DEFAULT 0,
        total_trades INTEGER DEFAULT 0,
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
        
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        stopped_at TIMESTAMP WITH TIME ZONE
      );
      
      CREATE INDEX idx_user_bots_user_id ON user_bots(user_id);
    `,
    down: `DROP TABLE IF EXISTS user_bots CASCADE;`,
  },

  // ============================================
  // TRADING SIGNALS
  // ============================================
  {
    name: 'Create trading_signals table',
    up: `
      CREATE TABLE IF NOT EXISTS trading_signals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider_id UUID REFERENCES users(id),
        trading_pair_id UUID NOT NULL REFERENCES trading_pairs(id),
        
        -- Signal details
        signal_type VARCHAR(20) NOT NULL CHECK (signal_type IN ('buy', 'sell', 'hold')),
        entry_price DECIMAL(30, 10) NOT NULL,
        target_price DECIMAL(30, 10),
        stop_loss DECIMAL(30, 10),
        
        -- Analysis
        confidence DECIMAL(5, 2),
        analysis TEXT,
        
        -- Results
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'hit_target', 'hit_stop', 'expired', 'cancelled')),
        exit_price DECIMAL(30, 10),
        profit_percent DECIMAL(10, 4),
        
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        closed_at TIMESTAMP WITH TIME ZONE
      );
      
      CREATE INDEX idx_trading_signals_status ON trading_signals(status);
      CREATE INDEX idx_trading_signals_created_at ON trading_signals(created_at);
    `,
    down: `DROP TABLE IF EXISTS trading_signals CASCADE;`,
  },

  // ============================================
  // KYC DOCUMENTS
  // ============================================
  {
    name: 'Create kyc_documents table',
    up: `
      CREATE TABLE IF NOT EXISTS kyc_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Document details
        document_type VARCHAR(30) NOT NULL CHECK (document_type IN ('passport', 'id_card', 'drivers_license', 'proof_of_address', 'selfie')),
        document_number VARCHAR(100),
        file_url VARCHAR(500) NOT NULL,
        
        -- Verification
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        rejection_reason TEXT,
        verified_by UUID REFERENCES users(id),
        verified_at TIMESTAMP WITH TIME ZONE,
        
        -- Metadata
        expires_at DATE,
        metadata JSONB,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_kyc_documents_user_id ON kyc_documents(user_id);
      CREATE INDEX idx_kyc_documents_status ON kyc_documents(status);
    `,
    down: `DROP TABLE IF EXISTS kyc_documents CASCADE;`,
  },

  // ============================================
  // LAUNCHPAD
  // ============================================
  {
    name: 'Create launchpad_projects table',
    up: `
      CREATE TABLE IF NOT EXISTS launchpad_projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cryptocurrency_id UUID REFERENCES cryptocurrencies(id),
        
        -- Project details
        name VARCHAR(100) NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        description TEXT,
        website_url VARCHAR(500),
        whitepaper_url VARCHAR(500),
        
        -- Sale details
        token_price DECIMAL(30, 10) NOT NULL,
        total_supply DECIMAL(30, 10) NOT NULL,
        tokens_for_sale DECIMAL(30, 10) NOT NULL,
        tokens_sold DECIMAL(30, 10) DEFAULT 0,
        min_allocation DECIMAL(30, 10),
        max_allocation DECIMAL(30, 10),
        
        -- Payment
        payment_currency_id UUID REFERENCES cryptocurrencies(id),
        hard_cap DECIMAL(30, 10),
        soft_cap DECIMAL(30, 10),
        
        -- Schedule
        status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended', 'cancelled', 'distributed')),
        starts_at TIMESTAMP WITH TIME ZONE,
        ends_at TIMESTAMP WITH TIME ZONE,
        distribution_at TIMESTAMP WITH TIME ZONE,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `,
    down: `DROP TABLE IF EXISTS launchpad_projects CASCADE;`,
  },

  {
    name: 'Create launchpad_participations table',
    up: `
      CREATE TABLE IF NOT EXISTS launchpad_participations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id UUID NOT NULL REFERENCES launchpad_projects(id),
        
        -- Participation
        amount_paid DECIMAL(30, 10) NOT NULL,
        tokens_allocated DECIMAL(30, 10) NOT NULL,
        
        -- Status
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'distributed', 'refunded')),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        distributed_at TIMESTAMP WITH TIME ZONE,
        
        UNIQUE(user_id, project_id)
      );
      
      CREATE INDEX idx_launchpad_participations_user_id ON launchpad_participations(user_id);
      CREATE INDEX idx_launchpad_participations_project_id ON launchpad_participations(project_id);
    `,
    down: `DROP TABLE IF EXISTS launchpad_participations CASCADE;`,
  },

  // ============================================
  // AUDIT LOG
  // ============================================
  {
    name: 'Create audit_logs table',
    up: `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        
        -- Action details
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        old_values JSONB,
        new_values JSONB,
        
        -- Request info
        ip_address VARCHAR(45),
        user_agent TEXT,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
    `,
    down: `DROP TABLE IF EXISTS audit_logs CASCADE;`,
  },

  // ============================================
  // SYSTEM SETTINGS
  // ============================================
  {
    name: 'Create system_settings table',
    up: `
      CREATE TABLE IF NOT EXISTS system_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key VARCHAR(100) UNIQUE NOT NULL,
        value JSONB NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        updated_by UUID REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_system_settings_key ON system_settings(key);
    `,
    down: `DROP TABLE IF EXISTS system_settings CASCADE;`,
  },
];

/**
 * Run migrations
 * @param {boolean} fresh - Drop all tables first
 */
async function migrate(fresh = false) {
  const client = await pool.connect();
  
  try {
    if (fresh) {
      logger.info('Dropping all tables...');
      for (const migration of [...migrations].reverse()) {
        try {
          await client.query(migration.down);
          logger.info(`Dropped: ${migration.name}`);
        } catch (error) {
          // Ignore errors when dropping
        }
      }
    }

    logger.info('Running migrations...');
    for (const migration of migrations) {
      try {
        await client.query(migration.up);
        logger.info(`✓ ${migration.name}`);
      } catch (error) {
        if (error.code === '42P07') {
          logger.info(`⊖ ${migration.name} (already exists)`);
        } else {
          logger.error(`✗ ${migration.name}: ${error.message}`);
          throw error;
        }
      }
    }

    logger.info('✅ All migrations completed successfully!');
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  const fresh = process.argv.includes('fresh');
  migrate(fresh)
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrate, migrations };
