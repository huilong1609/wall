const { User } = require('../models');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const config = require('../config');

class KycService {
  /**
   * Get KYC status
   */
  async getKycStatus(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const limits = config.verificationLimits;
    const currentLimits = user.getVerificationLimits();

    return {
      status: user.kycStatus,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      limits: currentLimits,
      nextLevel: this.getNextLevel(user.kycStatus),
      requirements: this.getRequirements(user.kycStatus),
    };
  }

  /**
   * Get next KYC level info
   */
  getNextLevel(currentStatus) {
    const levels = ['none', 'level1', 'level2', 'level3', 'level4'];
    const currentIndex = levels.indexOf(currentStatus);
    
    if (currentIndex === -1 || currentIndex >= levels.length - 1) {
      return null;
    }

    const nextLevel = levels[currentIndex + 1];
    const limits = config.verificationLimits[nextLevel];

    return {
      level: nextLevel,
      limits,
      requirements: this.getRequirements(currentStatus),
    };
  }

  /**
   * Get requirements for next level
   */
  getRequirements(currentStatus) {
    const requirements = {
      none: [
        { id: 'email', name: 'Email Verification', description: 'Verify your email address' },
        { id: 'basic_info', name: 'Basic Information', description: 'Provide name, date of birth, address' },
      ],
      level1: [
        { id: 'phone', name: 'Phone Verification', description: 'Verify your phone number' },
        { id: 'id_document', name: 'ID Document', description: 'Upload government-issued ID' },
      ],
      level2: [
        { id: 'selfie', name: 'Selfie Verification', description: 'Take a selfie with your ID' },
        { id: 'address_proof', name: 'Proof of Address', description: 'Upload utility bill or bank statement' },
      ],
      level3: [
        { id: 'source_of_funds', name: 'Source of Funds', description: 'Provide documentation of income source' },
        { id: 'enhanced_due_diligence', name: 'Enhanced Due Diligence', description: 'Additional verification for high-volume traders' },
      ],
      level4: [],
    };

    return requirements[currentStatus] || [];
  }

  /**
   * Submit basic info (Level 1)
   */
  async submitBasicInfo(userId, info) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.kycStatus !== 'none') {
      throw new BadRequestError('Basic info already submitted');
    }

    await user.update({
      firstName: info.firstName,
      lastName: info.lastName,
      phone: info.phone,
      country: info.country,
      city: info.city,
      kycStatus: 'pending',
    });

    // In production, this would trigger review process
    // For demo, auto-approve to level1
    await user.update({ kycStatus: 'level1' });

    return { status: 'level1', message: 'Basic verification completed' };
  }

  /**
   * Submit ID document
   */
  async submitIdDocument(userId, documentData) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.kycStatus === 'none') {
      throw new BadRequestError('Please complete basic verification first');
    }

    // Store document info (in production, upload to secure storage)
    const documents = user.metadata?.kycDocuments || [];
    documents.push({
      type: documentData.type,
      url: documentData.url,
      status: 'pending',
      uploadedAt: new Date(),
    });

    await user.update({
      metadata: { ...user.metadata, kycDocuments: documents },
      kycStatus: 'pending',
    });

    // In production, this would trigger manual review
    // For demo, auto-approve after delay
    setTimeout(async () => {
      await user.update({ kycStatus: 'level2' });
    }, 5000);

    return { status: 'pending', message: 'Document submitted for review' };
  }

  /**
   * Submit selfie verification
   */
  async submitSelfie(userId, selfieData) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.kycStatus !== 'level2') {
      throw new BadRequestError('Please complete previous verification steps');
    }

    const documents = user.metadata?.kycDocuments || [];
    documents.push({
      type: 'selfie',
      url: selfieData.url,
      status: 'pending',
      uploadedAt: new Date(),
    });

    await user.update({
      metadata: { ...user.metadata, kycDocuments: documents },
      kycStatus: 'pending',
    });

    // Auto-approve for demo
    setTimeout(async () => {
      await user.update({ kycStatus: 'level3' });
    }, 5000);

    return { status: 'pending', message: 'Selfie submitted for review' };
  }

  /**
   * Submit address proof
   */
  async submitAddressProof(userId, proofData) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const documents = user.metadata?.kycDocuments || [];
    documents.push({
      type: proofData.type,
      url: proofData.url,
      status: 'pending',
      uploadedAt: new Date(),
    });

    await user.update({
      metadata: { ...user.metadata, kycDocuments: documents },
    });

    return { status: 'pending', message: 'Address proof submitted for review' };
  }

  /**
   * Get submitted documents
   */
  async getDocuments(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user.metadata?.kycDocuments || [];
  }
}

module.exports = new KycService();
