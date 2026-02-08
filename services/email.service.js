/**
 * Email Service
 * Handles all email communications including verification, notifications, and alerts
 */

const nodemailer = require('nodemailer');
const logger = require('../config/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.templates = this.loadTemplates();
  }

  /**
   * Initialize email transporter
   */
  async initialize() {
    if (this.initialized) return;

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100
      });

      // Verify connection
      if (process.env.NODE_ENV !== 'test') {
        await this.transporter.verify();
        logger.info('Email service initialized successfully');
      }

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      // Don't throw - allow app to run without email in development
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  /**
   * Load email templates
   */
  loadTemplates() {
    return {
      verification: {
        subject: 'Verify Your Email - CryptoTrade',
        html: (data) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
              .code { background: #1f2937; color: #10b981; padding: 15px 25px; font-size: 24px; letter-spacing: 5px; border-radius: 8px; font-family: monospace; display: inline-block; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
              .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Email Verification</h1>
              </div>
              <div class="content">
                <p>Hi ${data.name || 'there'},</p>
                <p>Welcome to CryptoTrade! Please verify your email address to complete your registration.</p>
                <p>Your verification code is:</p>
                <p style="text-align: center;"><span class="code">${data.code}</span></p>
                <p>Or click the button below:</p>
                <p style="text-align: center;">
                  <a href="${data.verifyUrl}" class="button">Verify Email</a>
                </p>
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong> This code expires in 24 hours. If you didn't create an account, please ignore this email.
                </div>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} CryptoTrade. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
              </div>
            </div>
          </body>
          </html>
        `
      },

      passwordReset: {
        subject: 'Reset Your Password - CryptoTrade',
        html: (data) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .button { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
              .code { background: #1f2937; color: #fbbf24; padding: 15px 25px; font-size: 24px; letter-spacing: 5px; border-radius: 8px; font-family: monospace; display: inline-block; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
              .warning { background: #fee2e2; border: 1px solid #ef4444; padding: 15px; border-radius: 8px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔑 Password Reset</h1>
              </div>
              <div class="content">
                <p>Hi ${data.name || 'there'},</p>
                <p>We received a request to reset your password. Use the code below:</p>
                <p style="text-align: center;"><span class="code">${data.code}</span></p>
                <p>Or click the button below:</p>
                <p style="text-align: center;">
                  <a href="${data.resetUrl}" class="button">Reset Password</a>
                </p>
                <div class="warning">
                  <strong>🚨 Important:</strong> This code expires in 1 hour. If you didn't request this reset, please secure your account immediately and contact support.
                </div>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} CryptoTrade. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      },

      twoFactorCode: {
        subject: 'Your 2FA Code - CryptoTrade',
        html: (data) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .code { background: #1f2937; color: #10b981; padding: 20px 40px; font-size: 32px; letter-spacing: 8px; border-radius: 8px; font-family: monospace; display: inline-block; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
              .info { background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🛡️ Two-Factor Authentication</h1>
              </div>
              <div class="content">
                <p>Hi ${data.name || 'there'},</p>
                <p>Your two-factor authentication code is:</p>
                <p style="text-align: center;"><span class="code">${data.code}</span></p>
                <div class="info">
                  <p><strong>📍 Login Details:</strong></p>
                  <p>IP Address: ${data.ipAddress || 'Unknown'}</p>
                  <p>Location: ${data.location || 'Unknown'}</p>
                  <p>Device: ${data.device || 'Unknown'}</p>
                  <p>Time: ${new Date().toUTCString()}</p>
                </div>
                <p style="margin-top: 20px; color: #6b7280;">This code expires in 10 minutes.</p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} CryptoTrade. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      },

      loginAlert: {
        subject: '🔔 New Login Detected - CryptoTrade',
        html: (data) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .details { background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
              .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
              .button { display: inline-block; background: #ef4444; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: 600; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔔 New Login Detected</h1>
              </div>
              <div class="content">
                <p>Hi ${data.name || 'there'},</p>
                <p>We detected a new login to your account:</p>
                <div class="details">
                  <div class="details-row"><span>📅 Time:</span><span>${new Date().toUTCString()}</span></div>
                  <div class="details-row"><span>📍 IP Address:</span><span>${data.ipAddress || 'Unknown'}</span></div>
                  <div class="details-row"><span>🌍 Location:</span><span>${data.location || 'Unknown'}</span></div>
                  <div class="details-row"><span>💻 Device:</span><span>${data.device || 'Unknown'}</span></div>
                  <div class="details-row"><span>🌐 Browser:</span><span>${data.browser || 'Unknown'}</span></div>
                </div>
                <p style="margin-top: 20px;">If this wasn't you, please secure your account immediately:</p>
                <p style="text-align: center;">
                  <a href="${data.secureUrl}" class="button">Secure My Account</a>
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} CryptoTrade. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      },

      withdrawalConfirmation: {
        subject: '💸 Withdrawal Request - CryptoTrade',
        html: (data) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .amount { font-size: 36px; font-weight: 700; color: #1f2937; text-align: center; margin: 20px 0; }
              .details { background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
              .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 5px; }
              .button-cancel { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
              .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💸 Withdrawal Request</h1>
              </div>
              <div class="content">
                <p>Hi ${data.name || 'there'},</p>
                <p>You've requested a withdrawal from your account:</p>
                <div class="amount">${data.amount} ${data.currency}</div>
                <div class="details">
                  <p><strong>Transaction Details:</strong></p>
                  <p>📍 To Address: <code>${data.address}</code></p>
                  <p>💰 Network Fee: ${data.fee} ${data.currency}</p>
                  <p>📊 Total Deducted: ${data.total} ${data.currency}</p>
                  <p>🆔 Reference: ${data.reference}</p>
                </div>
                <p style="text-align: center; margin-top: 20px;">
                  <a href="${data.confirmUrl}" class="button">Confirm Withdrawal</a>
                  <a href="${data.cancelUrl}" class="button button-cancel">Cancel</a>
                </p>
                <div class="warning">
                  <strong>⚠️ Warning:</strong> This confirmation link expires in 30 minutes. Please verify the destination address carefully - cryptocurrency transactions are irreversible.
                </div>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} CryptoTrade. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      },

      depositConfirmed: {
        subject: '✅ Deposit Confirmed - CryptoTrade',
        html: (data) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .amount { font-size: 36px; font-weight: 700; color: #10b981; text-align: center; margin: 20px 0; }
              .details { background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Deposit Confirmed</h1>
              </div>
              <div class="content">
                <p>Hi ${data.name || 'there'},</p>
                <p>Great news! Your deposit has been confirmed and credited to your account.</p>
                <div class="amount">+${data.amount} ${data.currency}</div>
                <div class="details">
                  <p><strong>Transaction Details:</strong></p>
                  <p>🔗 TX Hash: <code>${data.txHash}</code></p>
                  <p>✅ Confirmations: ${data.confirmations}</p>
                  <p>💵 USD Value: $${data.usdValue}</p>
                  <p>📅 Time: ${new Date().toUTCString()}</p>
                </div>
                <p style="text-align: center; margin-top: 20px;">
                  <a href="${data.dashboardUrl}" class="button">View Balance</a>
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} CryptoTrade. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      },

      orderFilled: {
        subject: '📈 Order Filled - CryptoTrade',
        html: (data) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, ${data.side === 'buy' ? '#10b981, #059669' : '#ef4444, #dc2626'}); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .trade-type { font-size: 24px; font-weight: 700; color: ${data.side === 'buy' ? '#10b981' : '#ef4444'}; text-align: center; margin: 10px 0; }
              .amount { font-size: 36px; font-weight: 700; color: #1f2937; text-align: center; margin: 10px 0; }
              .details { background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📈 Order Filled</h1>
              </div>
              <div class="content">
                <p>Hi ${data.name || 'there'},</p>
                <p>Your ${data.orderType} order has been filled!</p>
                <div class="trade-type">${data.side.toUpperCase()}</div>
                <div class="amount">${data.amount} ${data.baseCurrency}</div>
                <div class="details">
                  <p><strong>Order Details:</strong></p>
                  <p>📊 Pair: ${data.pair}</p>
                  <p>💰 Price: ${data.price} ${data.quoteCurrency}</p>
                  <p>📈 Total: ${data.total} ${data.quoteCurrency}</p>
                  <p>💸 Fee: ${data.fee} ${data.quoteCurrency}</p>
                  <p>🆔 Order ID: ${data.orderId}</p>
                </div>
                <p style="text-align: center; margin-top: 20px;">
                  <a href="${data.portfolioUrl}" class="button">View Portfolio</a>
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} CryptoTrade. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      },

      priceAlert: {
        subject: '🚨 Price Alert Triggered - CryptoTrade',
        html: (data) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .price { font-size: 48px; font-weight: 700; color: ${data.direction === 'up' ? '#10b981' : '#ef4444'}; text-align: center; margin: 20px 0; }
              .arrow { font-size: 24px; }
              .details { background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚨 Price Alert</h1>
              </div>
              <div class="content">
                <p>Hi ${data.name || 'there'},</p>
                <p>Your price alert for <strong>${data.symbol}</strong> has been triggered!</p>
                <div class="details">
                  <p style="font-size: 20px; margin: 0;">${data.symbol}</p>
                  <div class="price">
                    <span class="arrow">${data.direction === 'up' ? '↑' : '↓'}</span>
                    $${data.currentPrice}
                  </div>
                  <p>Alert Condition: ${data.condition} $${data.targetPrice}</p>
                </div>
                <p style="text-align: center; margin-top: 20px;">
                  <a href="${data.tradeUrl}" class="button">Trade Now</a>
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} CryptoTrade. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      },

      stakingReward: {
        subject: '🎁 Staking Reward Received - CryptoTrade',
        html: (data) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .reward { font-size: 36px; font-weight: 700; color: #f59e0b; text-align: center; margin: 20px 0; }
              .details { background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎁 Staking Reward</h1>
              </div>
              <div class="content">
                <p>Hi ${data.name || 'there'},</p>
                <p>You've received a staking reward!</p>
                <div class="reward">+${data.amount} ${data.currency}</div>
                <div class="details">
                  <p><strong>Staking Details:</strong></p>
                  <p>📊 Pool: ${data.poolName}</p>
                  <p>💰 Staked Amount: ${data.stakedAmount} ${data.currency}</p>
                  <p>📈 APY: ${data.apy}%</p>
                  <p>💵 USD Value: $${data.usdValue}</p>
                  <p>📅 Total Rewards: ${data.totalRewards} ${data.currency}</p>
                </div>
                <p style="text-align: center; margin-top: 20px;">
                  <a href="${data.stakingUrl}" class="button">View Staking</a>
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} CryptoTrade. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      },

      kycApproved: {
        subject: '✅ KYC Verification Approved - CryptoTrade',
        html: (data) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .checkmark { font-size: 64px; text-align: center; }
              .benefits { background: #ecfdf5; padding: 20px; border-radius: 8px; border: 1px solid #10b981; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ KYC Approved</h1>
              </div>
              <div class="content">
                <div class="checkmark">✅</div>
                <p>Hi ${data.name || 'there'},</p>
                <p>Congratulations! Your KYC verification has been approved. You now have access to enhanced features:</p>
                <div class="benefits">
                  <p>🔓 <strong>Unlocked Benefits:</strong></p>
                  <ul>
                    <li>Higher withdrawal limits (up to $${data.withdrawLimit}/day)</li>
                    <li>Higher trading limits</li>
                    <li>Fiat deposits and withdrawals</li>
                    <li>Priority customer support</li>
                  </ul>
                </div>
                <p style="text-align: center; margin-top: 20px;">
                  <a href="${data.dashboardUrl}" class="button">Start Trading</a>
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} CryptoTrade. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      },

      kycRejected: {
        subject: '❌ KYC Verification Update - CryptoTrade',
        html: (data) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .reason { background: #fee2e2; padding: 20px; border-radius: 8px; border: 1px solid #ef4444; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>❌ KYC Update Required</h1>
              </div>
              <div class="content">
                <p>Hi ${data.name || 'there'},</p>
                <p>Unfortunately, we couldn't verify your identity with the documents provided.</p>
                <div class="reason">
                  <p><strong>Reason:</strong></p>
                  <p>${data.reason}</p>
                </div>
                <p style="margin-top: 20px;"><strong>What you can do:</strong></p>
                <ul>
                  <li>Ensure documents are clear and readable</li>
                  <li>Make sure all information matches</li>
                  <li>Use a government-issued ID</li>
                  <li>Ensure your face is clearly visible in selfie</li>
                </ul>
                <p style="text-align: center; margin-top: 20px;">
                  <a href="${data.resubmitUrl}" class="button">Resubmit Documents</a>
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} CryptoTrade. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      },

      referralReward: {
        subject: '🎉 Referral Reward Earned - CryptoTrade',
        html: (data) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .reward { font-size: 36px; font-weight: 700; color: #ec4899; text-align: center; margin: 20px 0; }
              .details { background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
              .share-box { background: #fdf2f8; padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px; }
              .button { display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Referral Reward!</h1>
              </div>
              <div class="content">
                <p>Hi ${data.name || 'there'},</p>
                <p>Great news! Your referral just earned you a reward!</p>
                <div class="reward">+$${data.amount}</div>
                <div class="details">
                  <p><strong>Details:</strong></p>
                  <p>👤 Referred User: ${data.referredUser}</p>
                  <p>💰 Commission Rate: ${data.commissionRate}%</p>
                  <p>📊 Total Referrals: ${data.totalReferrals}</p>
                  <p>💵 Total Earned: $${data.totalEarned}</p>
                </div>
                <div class="share-box">
                  <p><strong>Keep earning!</strong> Share your referral link:</p>
                  <p><code>${data.referralLink}</code></p>
                </div>
                <p style="text-align: center; margin-top: 20px;">
                  <a href="${data.referralUrl}" class="button">View Referrals</a>
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} CryptoTrade. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
      },

      weeklyReport: {
        subject: '📊 Your Weekly Trading Report - CryptoTrade',
        html: (data) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 28px; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
              .stat-box { background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center; }
              .stat-value { font-size: 24px; font-weight: 700; color: #1f2937; }
              .stat-label { color: #6b7280; font-size: 14px; }
              .profit { color: #10b981; }
              .loss { color: #ef4444; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📊 Weekly Report</h1>
                <p style="color: #e5e7eb; margin: 5px 0 0;">${data.weekRange}</p>
              </div>
              <div class="content">
                <p>Hi ${data.name || 'there'},</p>
                <p>Here's your trading summary for the past week:</p>
                <div class="stat-grid">
                  <div class="stat-box">
                    <div class="stat-value ${data.portfolioChange >= 0 ? 'profit' : 'loss'}">
                      ${data.portfolioChange >= 0 ? '+' : ''}${data.portfolioChange}%
                    </div>
                    <div class="stat-label">Portfolio Change</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-value">$${data.portfolioValue}</div>
                    <div class="stat-label">Portfolio Value</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-value">${data.tradesCount}</div>
                    <div class="stat-label">Trades Made</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-value">$${data.volume}</div>
                    <div class="stat-label">Trading Volume</div>
                  </div>
                </div>
                <p><strong>Top Performers:</strong></p>
                <ul>
                  ${data.topAssets.map(a => `<li>${a.symbol}: ${a.change >= 0 ? '+' : ''}${a.change}%</li>`).join('')}
                </ul>
                <p style="text-align: center; margin-top: 20px;">
                  <a href="${data.dashboardUrl}" class="button">View Full Report</a>
                </p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} CryptoTrade. All rights reserved.</p>
                <p><a href="${data.unsubscribeUrl}">Unsubscribe from weekly reports</a></p>
              </div>
            </div>
          </body>
          </html>
        `
      }
    };
  }

  /**
   * Send email using template
   */
  async sendTemplate(to, templateName, data) {
    if (!this.initialized) {
      await this.initialize();
    }

    const template = this.templates[templateName];
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    return this.send({
      to,
      subject: template.subject,
      html: template.html(data)
    });
  }

  /**
   * Send raw email
   */
  async send({ to, subject, html, text, attachments }) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.transporter) {
      logger.warn('Email service not initialized, skipping email send');
      return { success: false, reason: 'Email service not initialized' };
    }

    try {
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'CryptoTrade'}" <${process.env.EMAIL_FROM || 'noreply@cryptotrade.io'}>`,
        to,
        subject,
        html,
        text: text || this.htmlToText(html),
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to,
        subject
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send email:', {
        error: error.message,
        to,
        subject
      });

      if (process.env.NODE_ENV === 'production') {
        throw error;
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulk(recipients, templateName, getData) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const data = typeof getData === 'function' ? getData(recipient) : getData;
        const result = await this.sendTemplate(recipient.email, templateName, data);
        results.push({ email: recipient.email, ...result });
      } catch (error) {
        results.push({ email: recipient.email, success: false, error: error.message });
      }
      
      // Rate limiting: wait between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Convert HTML to plain text
   */
  htmlToText(html) {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Verify email address format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Queue email for async sending
   */
  async queue(to, templateName, data, priority = 'normal') {
    // In a real implementation, this would add to a job queue (Bull, Agenda, etc.)
    // For now, just send immediately
    logger.info('Email queued', { to, templateName, priority });
    return this.sendTemplate(to, templateName, data);
  }

  /**
   * Close transporter connection
   */
  async close() {
    if (this.transporter) {
      this.transporter.close();
      this.initialized = false;
      logger.info('Email service closed');
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
