const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Setting = sequelize.define('Setting', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'array'),
      defaultValue: 'string',
    },
    category: {
      type: DataTypes.STRING(50),
      defaultValue: 'general',
    },
    description: {
      type: DataTypes.TEXT,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_public',
    },
    isEditable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_editable',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  }, {
    tableName: 'settings',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['key'] },
      { fields: ['category'] },
      { fields: ['is_public'] },
    ],
  });

  // Instance Methods
  Setting.prototype.getValue = function () {
    switch (this.type) {
      case 'number':
        return parseFloat(this.value);
      case 'boolean':
        return this.value === 'true' || this.value === '1';
      case 'json':
        try {
          return JSON.parse(this.value);
        } catch (e) {
          return {};
        }
      case 'array':
        try {
          return JSON.parse(this.value);
        } catch (e) {
          return [];
        }
      default:
        return this.value;
    }
  };

  Setting.prototype.setValue = function (value) {
    switch (this.type) {
      case 'number':
        this.value = String(value);
        break;
      case 'boolean':
        this.value = value ? 'true' : 'false';
        break;
      case 'json':
      case 'array':
        this.value = JSON.stringify(value);
        break;
      default:
        this.value = String(value);
    }
    return this;
  };

  // Class Methods
  Setting.get = async function (key, defaultValue = null) {
    const setting = await this.findOne({ where: { key } });
    if (!setting) return defaultValue;
    return setting.getValue();
  };

  Setting.set = async function (key, value, type = 'string') {
    const [setting] = await this.findOrCreate({
      where: { key },
      defaults: { key, value: String(value), type },
    });
    
    if (setting) {
      setting.type = type;
      setting.setValue(value);
      await setting.save();
    }
    
    return setting;
  };

  Setting.getByCategory = async function (category) {
    const settings = await this.findAll({ 
      where: { category },
      order: [['key', 'ASC']],
    });
    
    const result = {};
    settings.forEach(setting => {
      result[setting.key] = setting.getValue();
    });
    
    return result;
  };

  Setting.getPublic = async function () {
    const settings = await this.findAll({ 
      where: { isPublic: true },
      order: [['category', 'ASC'], ['key', 'ASC']],
    });
    
    const result = {};
    settings.forEach(setting => {
      if (!result[setting.category]) {
        result[setting.category] = {};
      }
      result[setting.category][setting.key] = setting.getValue();
    });
    
    return result;
  };

  Setting.bulkSet = async function (settings) {
    const promises = Object.entries(settings).map(([key, config]) => {
      const { value, type = 'string', category = 'general', description = '' } = 
        typeof config === 'object' && config !== null && !Array.isArray(config)
          ? config
          : { value: config };
      
      return this.set(key, value, type).then(setting => {
        setting.category = category;
        setting.description = description;
        return setting.save();
      });
    });
    
    return Promise.all(promises);
  };

  Setting.delete = async function (key) {
    return this.destroy({ where: { key } });
  };

  return Setting;
};
