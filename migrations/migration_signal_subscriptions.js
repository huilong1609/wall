'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('SignalSubscriptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      providerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'SignalProviders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM('active', 'cancelled', 'expired', 'suspended'),
        defaultValue: 'active',
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      endDate: {
        type: Sequelize.DATE,
      },
      autoRenew: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      pricePeriod: {
        type: Sequelize.ENUM('free', 'month', 'year', 'lifetime'),
        defaultValue: 'month',
      },
      lastPaymentDate: {
        type: Sequelize.DATE,
      },
      nextPaymentDate: {
        type: Sequelize.DATE,
      },
      notificationsEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      autoCopyEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      autoCopyConfig: {
        type: Sequelize.TEXT,
      },
      signalsTaken: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      profitLoss: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0,
      },
      rating: {
        type: Sequelize.INTEGER,
      },
      review: {
        type: Sequelize.TEXT,
      },
      reviewedAt: {
        type: Sequelize.DATE,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('SignalSubscriptions', ['userId']);
    await queryInterface.addIndex('SignalSubscriptions', ['providerId']);
    await queryInterface.addIndex('SignalSubscriptions', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('SignalSubscriptions');
  },
};