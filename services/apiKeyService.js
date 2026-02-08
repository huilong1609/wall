const bcrypt = require('bcryptjs');
const { ApiKey } = require('../models');
const { generateApiKey, generateApiSecret } = require('../utils/helpers');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const config = require('../config');

class ApiKeyService {
  /**
   * Get all API keys for user
   */
  async getApiKeys(userId) {
    const apiKeys = await ApiKey.findAll({
      where: { userId },
      attributes: { exclude: ['secret', 'secretHash'] },
      order: [['createdAt', 'DESC']],
    });

    return apiKeys;
  }

  /**
   * Get API key by ID
   */
  async getApiKeyById(userId, keyId) {
    const apiKey = await ApiKey.findOne({
      where: { id: keyId, userId },
      attributes: { exclude: ['secret', 'secretHash'] },
    });

    if (!apiKey) {
      throw new NotFoundError('API key not found');
    }

    return apiKey;
  }

  /**
   * Create API key
   */
  async createApiKey(userId, keyData) {
    const { name, permissions, ipRestrictions, expiresAt } = keyData;

    // Check limit (max 10 active keys)
    const activeCount = await ApiKey.count({
      where: { userId, status: 'active' },
    });

    if (activeCount >= 10) {
      throw new BadRequestError('Maximum 10 active API keys allowed');
    }

    const key = generateApiKey();
    const secret = generateApiSecret();
    const secretHash = await bcrypt.hash(secret, config.bcryptSaltRounds);

    const apiKey = await ApiKey.create({
      userId,
      name,
      key,
      secret, // Will be removed after response
      secretHash,
      permissions: permissions || { read: true, trade: false, withdraw: false },
      ipRestrictions: ipRestrictions || [],
      expiresAt,
    });

    // Return with secret (only shown once)
    return {
      id: apiKey.id,
      name: apiKey.name,
      key: apiKey.key,
      secret, // Only returned on creation
      permissions: apiKey.permissions,
      ipRestrictions: apiKey.ipRestrictions,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * Update API key
   */
  async updateApiKey(userId, keyId, updates) {
    const apiKey = await ApiKey.findOne({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundError('API key not found');
    }

    const allowedUpdates = ['name', 'permissions', 'ipRestrictions', 'status', 'expiresAt'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    await apiKey.update(filteredUpdates);

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: apiKey.key,
      permissions: apiKey.permissions,
      ipRestrictions: apiKey.ipRestrictions,
      status: apiKey.status,
      expiresAt: apiKey.expiresAt,
    };
  }

  /**
   * Delete/Revoke API key
   */
  async deleteApiKey(userId, keyId) {
    const apiKey = await ApiKey.findOne({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundError('API key not found');
    }

    await apiKey.revoke();

    return { revoked: true };
  }

  /**
   * Verify API key and secret
   */
  async verifyApiKey(key, secret) {
    const apiKey = await ApiKey.findOne({
      where: { key, status: 'active' },
    });

    if (!apiKey) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      await apiKey.update({ status: 'inactive' });
      return null;
    }

    // Verify secret
    const isValid = await bcrypt.compare(secret, apiKey.secretHash);
    if (!isValid) {
      return null;
    }

    return apiKey;
  }

  /**
   * Get API key usage statistics
   */
  async getKeyStats(userId, keyId) {
    const apiKey = await this.getApiKeyById(userId, keyId);

    // In production, track actual API calls
    return {
      keyId: apiKey.id,
      name: apiKey.name,
      lastUsedAt: apiKey.lastUsedAt,
      lastUsedIp: apiKey.lastUsedIp,
      createdAt: apiKey.createdAt,
      // Mock stats
      totalRequests: Math.floor(Math.random() * 10000),
      requestsToday: Math.floor(Math.random() * 100),
      requestsThisMonth: Math.floor(Math.random() * 5000),
    };
  }
}

module.exports = new ApiKeyService();
