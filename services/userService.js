const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const config = require('../config');
const { sequelize, User, Session, Wallet, EmailOTP, Coin, Network, CoinNetwork, UserBalance } = require('../models');
const { generateReferralCode, generateRandomString, transporter } = require('../utils/helpers');
const { BadRequestError, UnauthorizedError, NotFoundError, ConflictError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');
const emailOtp = require('../models/EmailOTP');


class UserService {

  async updateCoinNetwork() {
    const ex = {
      BTC: ['BTC'],
      ETH: ['ERC20', 'ARBITRUM', 'OPTIMISM', 'BASE', 'POLYGON'],
      USDT: ['ERC20', 'TRC20', 'BEP20', 'POLYGON', 'SOLANA', 'AVAXC', 'ARBITRUM', 'OPTIMISM', 'BASE'],
      BCH: ['BCH'],
      LTC: ['LTC'],
      SOL: ['SOLANA'],
      TRX: ['TRC20'],
      DOGE: ['DOGE'],
    };

    return sequelize.transaction(async (t) => {
      const coins = await Coin.findAll({
        attributes: ['id', 'symbol'],
        transaction: t,
      });

      const networks = await Network.findAll({
        attributes: ['id', 'network'],
        transaction: t,
      });

      // ✅ Build lookup map: networkCode -> networkRow
      const networkByCode = new Map(networks.map(n => [n.network, n]));

      const existing = await CoinNetwork.findAll({
        attributes: ['coin_id', 'network_id'],
        transaction: t,
      });

      const existingSet = new Set(existing.map(r => `${r.coin_id}:${r.network_id}`));

      const rows = [];
      const missingNetworks = new Set();

      for (const coin of coins) {
        const codes = ex[coin.symbol] || [];

        for (const code of codes) {
          const network = networkByCode.get(code);

          if (!network) {
            missingNetworks.add(code);
            continue;
          }

          const key = `${coin.id}:${network.id}`;
          if (existingSet.has(key)) continue;

          rows.push({
            coinId: coin.id,
            networkId: network.id,
            status: true,
          });

          existingSet.add(key);
        }
      }

      if (rows.length) {
        await CoinNetwork.bulkCreate(rows, {
          ignoreDuplicates: true,
          transaction: t,
        });
      }

      if (missingNetworks.size) {
        console.warn('[updateCoinNetwork] Missing networks in DB:', [...missingNetworks]);
      }

      return { inserted: rows.length, missingNetworks: [...missingNetworks] };
    });
  }

  /**
   * Register a new user
   */
  async register(userData, ip, device) {
    const { email, pin, username, firstName, lastName, referralCode } = userData;
    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Check if username exists
    if (username) {
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        throw new ConflictError('Username already taken');
      }
    }

    // Handle referral
    let referredById = null;
    if (referralCode) {
      const referrer = await User.findOne({ where: { referralCode } });
      if (referrer) {
        referredById = referrer.id;
      }
    }
    const password = pin;
    // Create user
    const user = await User.create({
      email,
      password,
      username,
      pin,
      firstName,
      lastName,
      referredById,
      referralCode: generateReferralCode(),
      status: 'active',
      email_verified: true,
      emailVerificationToken: generateRandomString(32),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Create default wallets
    await Promise.all([
      Wallet.create({ userId: user.id, type: 'spot', currency: 'USDT' }),
      Wallet.create({ userId: user.id, type: 'spot', currency: 'BTC' }),
      Wallet.create({ userId: user.id, type: 'spot', currency: 'ETH' }),
    ]);

    logger.info(`New user registered: ${email}`);

    return {
      user: user.toJSON(),
      verificationToken: user.emailVerificationToken,
    };
  }

  async registerNew(userData, ip, device) {
    const {
      firstName, lastName, email, username, phone,
      country, currency, password, confirmPassword,
      pin, confirmPin, referralCode
    } = userData;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) throw new ConflictError('Email already registered');

    if (password !== confirmPassword) throw new ValidationError('Password does not match');
    if (pin !== confirmPin) throw new ValidationError('Pin entered does not match');

    const createdUser = await sequelize.transaction(async (t) => {
      // Coins to create wallets for
      const coins = await Coin.findAll({
        where: { allow_wallet: true, status: true },
        attributes: ['id', 'symbol'],
        transaction: t,
      });

      // Referral lookup
      let referredById = null;
      if (referralCode) {
        const referrer = await User.findOne({ where: { referralCode }, transaction: t });
        if (referrer) referredById = referrer.id;
      }

      // Create user
      const newUser = await User.create({
        email,
        password,
        username,
        pin,
        firstName,
        lastName,
        country,
        currency,
        phone,
        referredById,
        referralCode: generateReferralCode(),
        status: 'active',
        email_verified: true,
        emailVerificationToken: generateRandomString(32),
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        // ip,
        // device,
      }, { transaction: t });

      // Existing wallets for this new user (should be none, but keeps it rerunnable)
      const existingWallets = await Wallet.findAll({
        where: { userId: newUser.id },
        attributes: ['coinId', 'userId'], // MUST match your model attribute names
        transaction: t,
      });

      const existingSet = new Set(existingWallets.map(w => `${w.coinId}:${w.userId}`));

      // Build wallet rows
      const rows = [];
      for (const coin of coins) {
        const key = `${coin.id}:${newUser.id}`;
        if (existingSet.has(key)) continue;

        rows.push({
          reference: generateRandomString(16), // or uuidv4()
          coinId: coin.id,
          userId: newUser.id,
          status: true,
        });

        existingSet.add(key);
      }

      if (rows.length) {
        await Wallet.bulkCreate(rows, {
          ignoreDuplicates: true,
          transaction: t,
        });
      }

      // Create balance row idempotently
      await UserBalance.findOrCreate({
        where: { userId: newUser.id },
        defaults: { userId: newUser.id },
        transaction: t,
      });

      return newUser;
    });

    logger.info(`New user registered: ${email}`);

    return {
      user: createdUser.toJSON(),
    };
  }




  async start(userData, ip, device) {
    const { email } = userData;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return {
        registered: true,
      }
    }

    const opt = await EmailOTP.createOTP({ email: email, ip: ip, device: device })
    logger.info(`New OTP SENT FOR registered: ${email}`);
    transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Verification Code",
      text: `Your code is ${otp.code}`,
      html: `<h2>Your code is ${otp.code}</h2>`,
    })
      .then(() => logger.info(`OTP email sent: ${email}`))
      .catch((err) => logger.error({ err }, `OTP email failed: ${email}`));

    return {
      registered: false,
      //code: opt.code,
    };

  }

  /**
   * Login user
   */
  async login(email, password, ip, device, twoFactorCode = null) {
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if account is locked
    if (user.isLocked()) {
      throw new UnauthorizedError('Account temporarily locked. Please try again later.');
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check account status
    if (user.status === 'suspended') {
      throw new UnauthorizedError('Account suspended. Please contact support.');
    }

    if (user.status === 'pending' && !user.emailVerified) {
      throw new UnauthorizedError('Please verify your email before logging in.');
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return { requires2FA: true, userId: user.id };
      }

      const isValid = await this.verify2FACode(user.id, twoFactorCode);
      if (!isValid) {
        throw new UnauthorizedError('Invalid 2FA code');
      }
    }

    // Reset login attempts
    await user.update({ loginAttempts: 0, lockUntil: null });

    // Generate tokens
    const { accessToken, refreshToken, session } = await this.generateAuthTokens(user, ip, device);

    // Update last login
    await user.update({
      lastLogin: new Date(),
      lastLoginIp: ip,
      lastLoginDevice: device,
    });

    logger.info(`User logged in: ${email}`);

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
      sessionId: session.id,
    };
  }

  /**
   * Login user
   */
  async loginWithPin(email, pin, ip, device, twoFactorCode = null) {
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email');
    }

    // Check if account is locked
    if (user.isLocked()) {
      throw new UnauthorizedError('Account temporarily locked. Please try again later.');
    }

    // Verify password
    const isMatch = user.pin === pin;
    if (!isMatch) {
      await user.incrementLoginAttempts();
      throw new UnauthorizedError('Invalid email or pin');
    }

    // Check account status
    if (user.status === 'suspended') {
      throw new UnauthorizedError('Account suspended. Please contact support.');
    }

    if (user.status === 'pending' && !user.emailVerified) {
      throw new UnauthorizedError('Please verify your email before logging in.');
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return { requires2FA: true, userId: user.id };
      }

      const isValid = await this.verify2FACode(user.id, twoFactorCode);
      if (!isValid) {
        throw new UnauthorizedError('Invalid 2FA code');
      }
    }

    // Reset login attempts
    await user.update({ loginAttempts: 0, lockUntil: null });

    // Generate tokens
    const { accessToken, refreshToken, session } = await this.generateAuthTokens(user, ip, device);

    // Update last login
    await user.update({
      lastLogin: new Date(),
      lastLoginIp: ip,
      lastLoginDevice: device,
    });

    logger.info(`User logged in: ${email}`);

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
      sessionId: session.id,
    };
  }

  /**
   * Generate auth tokens and create session
   */
  async generateAuthTokens(user, ip, device) {
    // Create session
    const session = await Session.create({
      userId: user.id,
      token: generateRandomString(64),
      refreshToken: generateRandomString(64),
      ip,
      device,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Generate JWT access token
    const accessToken = jwt.sign(
      { id: user.id, sessionId: session.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expire }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { id: user.id, sessionId: session.id, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpire }
    );

    // Update session with tokens
    await session.update({ token: accessToken, refreshToken });

    return { accessToken, refreshToken, session };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      const session = await Session.findByPk(decoded.sessionId, {
        include: [{ model: User, as: 'user' }],
      });

      if (!session || !session.isActive) {
        throw new UnauthorizedError('Session expired');
      }

      if (session.refreshToken !== refreshToken) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { id: session.user.id, sessionId: session.id },
        config.jwt.secret,
        { expiresIn: config.jwt.expire }
      );

      await session.update({ token: accessToken, lastActiveAt: new Date() });

      return { accessToken };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(sessionId) {
    const session = await Session.findByPk(sessionId);
    if (session) {
      await session.revoke();
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId) {
    await Session.update(
      { isActive: false, revokedAt: new Date() },
      { where: { userId, isActive: true } }
    );
  }

  /**
   * Verify email
   */
  async verifyEmail(token) {
    const user = await User.findOne({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired verification token');
    }

    if (user.emailVerificationExpires < new Date()) {
      throw new BadRequestError('Verification token has expired');
    }

    await user.update({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      status: 'active',
    });

    logger.info(`Email verified: ${user.email}`);

    return user;
  }

  /**
   * Verify Email OTP
   * @param {Object} params
   * @param {string} params.email
   * @param {string} params.code
   * @returns {Object} { status: true, registered: boolean }
   */
  async verifyOTP({ email, code }) {
    if (!email || !code) {
      throw new BadRequestError('Email and OTP code are required');
    }

    // Find latest valid OTP
    const otp = await EmailOTP.findOne({
      where: {
        email,
        code,
        is_used: false,
      },
      order: [['created_at', 'DESC']],
    });

    if (!otp) {
      throw new BadRequestError('Invalid or expired OTP');
    }

    // Check expiry
    if (otp.isExpired()) {
      await otp.markAsUsed(); // optional: mark expired OTP as used
      throw new BadRequestError('OTP has expired');
    }

    // Mark as used
    await otp.verify(code);

    // Check if user exists
    const user = await User.findOne({ where: { email } });

    return {
      status: true,
      registered: !!user,
    };
  }


  /**
   * Resend verification email
   */
  async resendVerification(email) {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestError('Email already verified');
    }

    const token = generateRandomString(32);
    await user.update({
      emailVerificationToken: token,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return { token, email: user.email };
  }

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If an account exists, a reset email will be sent' };
    }

    const token = generateRandomString(32);
    await user.update({
      passwordResetToken: token,
      passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    return { token, email: user.email };
  }

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    const user = await User.findOne({
      where: {
        passwordResetToken: token,
      },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    if (user.passwordResetExpires < new Date()) {
      throw new BadRequestError('Reset token has expired');
    }

    await user.update({
      password: newPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    // Invalidate all sessions
    await this.logoutAll(user.id);

    logger.info(`Password reset: ${user.email}`);

    return user;
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    await user.update({ password: newPassword });

    logger.info(`Password changed: ${user.email}`);

    return user;
  }

  /**
   * Get user by ID
   */
  async getById(userId) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'bio',
      'country', 'city', 'timezone', 'language',
      'currency', 'dateFormat',
    ];

    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    await user.update(filteredUpdates);

    return user;
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(userId, preferences) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const currentPrefs = user.notificationPreferences || {};
    const updatedPrefs = { ...currentPrefs, ...preferences };

    await user.update({ notificationPreferences: updatedPrefs });

    return user;
  }

  /**
   * Setup 2FA
   */
  async setup2FA(userId) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestError('2FA is already enabled');
    }

    const secret = speakeasy.generateSecret({
      name: `${config.twoFA.appName}:${user.email}`,
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store secret temporarily (not enabled yet)
    await user.update({ twoFactorSecret: secret.base32 });

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
    };
  }

  /**
   * Enable 2FA
   */
  async enable2FA(userId, code) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestError('Please setup 2FA first');
    }

    // Verify code
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValid) {
      throw new BadRequestError('Invalid 2FA code');
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => generateRandomString(8));

    await user.update({
      twoFactorEnabled: true,
      backupCodes,
    });

    logger.info(`2FA enabled: ${user.email}`);

    return { backupCodes };
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId, code) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestError('2FA is not enabled');
    }

    // Verify code
    const isValid = await this.verify2FACode(userId, code);
    if (!isValid) {
      throw new BadRequestError('Invalid 2FA code');
    }

    await user.update({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: null,
    });

    logger.info(`2FA disabled: ${user.email}`);

    return user;
  }

  /**
   * Verify 2FA code
   */
  async verify2FACode(userId, code) {
    const user = await User.findByPk(userId);

    if (!user || !user.twoFactorSecret) {
      return false;
    }

    // Check TOTP code
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (isValid) return true;

    // Check backup codes
    if (user.backupCodes && user.backupCodes.includes(code)) {
      // Remove used backup code
      const updatedCodes = user.backupCodes.filter(c => c !== code);
      await user.update({ backupCodes: updatedCodes });
      return true;
    }

    return false;
  }

  /**
   * Get user sessions
   */
  async getSessions(userId) {
    const sessions = await Session.findAll({
      where: { userId, isActive: true },
      order: [['lastActiveAt', 'DESC']],
    });

    return sessions;
  }

  /**
   * Revoke session
   */
  async revokeSession(userId, sessionId) {
    const session = await Session.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    await session.revoke();

    return session;
  }
}

module.exports = new UserService();
