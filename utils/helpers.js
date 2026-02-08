const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * Generate a random string of specified length
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
};

/**
 * Generate a random numeric code of specified length
 */
const generateNumericCode = (length = 6) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generate a referral code
 */
const generateReferralCode = (prefix = '') => {
  const code = generateRandomString(8).toUpperCase();
  return prefix ? `${prefix}${code}` : code;
};


/**
 * Generate an API key
 */
const generateApiKey = () => {
  return `pk_${generateRandomString(32)}`;
};

/**
 * Generate an API secret
 */
const generateApiSecret = () => {
  return `sk_${generateRandomString(48)}`;
};

/**
 * Generate a transaction ID
 */
const generateTransactionId = (prefix = 'TXN') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateRandomString(6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Generate an order ID
 */
const generateOrderId = (type = 'ORD') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateRandomString(4).toUpperCase();
  return `${type}-${timestamp}-${random}`;
};

/**
 * Generate a ticket ID
 */
const generateTicketId = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `TKT-${year}-${random}`;
};

/**
 * Mask an email address
 */
const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  const maskedName = name.charAt(0) + '*'.repeat(Math.max(name.length - 2, 1)) + name.charAt(name.length - 1);
  return `${maskedName}@${domain}`;
};

/**
 * Mask a phone number
 */
const maskPhone = (phone) => {
  if (!phone || phone.length < 4) return phone;
  return phone.slice(0, 3) + '*'.repeat(phone.length - 6) + phone.slice(-3);
};

/**
 * Mask a wallet address
 */
const maskWalletAddress = (address) => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Format currency
 */
const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Format percentage
 */
const formatPercentage = (value, decimals = 2) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Calculate percentage change
 */
const calculatePercentageChange = (oldValue, newValue) => {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
};

/**
 * Round to specified decimal places
 */
const roundToDecimals = (value, decimals = 2) => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Check if value is within range
 */
const isInRange = (value, min, max) => {
  return value >= min && value <= max;
};

/**
 * Paginate array
 */
const paginate = (array, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    data: array.slice(startIndex, endIndex),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(array.length / limit),
      totalItems: array.length,
      itemsPerPage: limit,
      hasNextPage: endIndex < array.length,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry function with exponential backoff
 */
const retry = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay * Math.pow(2, i));
    }
  }
};

/**
 * Parse sort query string
 */
const parseSortQuery = (sortString, allowedFields = []) => {
  if (!sortString) return {};
  
  const sortObj = {};
  const fields = sortString.split(',');
  
  fields.forEach(field => {
    const order = field.startsWith('-') ? -1 : 1;
    const fieldName = field.replace(/^-/, '');
    
    if (allowedFields.length === 0 || allowedFields.includes(fieldName)) {
      sortObj[fieldName] = order;
    }
  });
  
  return sortObj;
};

/**
 * Build MongoDB filter from query params
 */
const buildFilter = (query, allowedFilters = {}) => {
  const filter = {};
  
  Object.keys(allowedFilters).forEach(key => {
    if (query[key] !== undefined) {
      const { field, type } = allowedFilters[key];
      const value = query[key];
      
      switch (type) {
        case 'exact':
          filter[field || key] = value;
          break;
        case 'regex':
          filter[field || key] = { $regex: value, $options: 'i' };
          break;
        case 'number':
          filter[field || key] = Number(value);
          break;
        case 'boolean':
          filter[field || key] = value === 'true';
          break;
        case 'array':
          filter[field || key] = { $in: value.split(',') };
          break;
        case 'dateRange':
          if (query[`${key}From`]) {
            filter[field || key] = { $gte: new Date(query[`${key}From`]) };
          }
          if (query[`${key}To`]) {
            filter[field || key] = { 
              ...filter[field || key], 
              $lte: new Date(query[`${key}To`]) 
            };
          }
          break;
        default:
          filter[field || key] = value;
      }
    }
  });
  
  return filter;
};

const randomNumber = function (length = 3) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


const generateUniqueUsernameRandom =   function (email, maxAttempts = 10) {
  let base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  let username = base;

  const suffix = randomNumber(6); // e.g. 482
    const trimmedBase = base.slice(0, 20 - suffix.toString().length);
    username = `${trimmedBase}${suffix}`;

    return username
}

const computeBotEndDate = (startDate, pricePeriod) => {
  const end = new Date(startDate);

  switch (pricePeriod) {
    case "daily":
      end.setDate(end.getDate() + 1);
      break;
    case "weekly":
      end.setDate(end.getDate() + 7);
      break;
    case "monthly":
      end.setMonth(end.getMonth() + 1);
      break;
    case "yearly":
      end.setFullYear(end.getFullYear() + 1);
      break;
    default:
      // fallback: 30 days
      end.setDate(end.getDate() + 30);
      break;
  }

  return end;
}

function addDuration(date, duration = 0, period = "days") {
  const d = new Date(date);

  const n = Number(duration);
  if (!Number.isFinite(n) || n <= 0) return d;

  switch (String(period).toLowerCase()) {
    case "minute":
    case "minutes":
      d.setMinutes(d.getMinutes() + n);
      return d;

    case "hour":
    case "hours":
      d.setHours(d.getHours() + n);
      return d;

    case "day":
    case "days":
      d.setDate(d.getDate() + n);
      return d;

    case "week":
    case "weeks":
      d.setDate(d.getDate() + n * 7);
      return d;

    case "month":
    case "months":
      d.setMonth(d.getMonth() + n);
      return d;

    case "year":
    case "years":
      d.setFullYear(d.getFullYear() + n);
      return d;

    default:
      // fallback: treat unknown as days
      d.setDate(d.getDate() + n);
      return d;
  }
}

function toISO(date) {
  // safe for API responses
  return date ? new Date(date).toISOString() : null;
}

const safeNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };



const transporter = nodemailer.createTransport({
  host: 'smtp.elitetrustvault.com', // or your SMTP host
  port: 465,
  secure: true, // true for 465
  auth: {
    user: "no-reply@elitetrustvault.com",
    pass: "Mb417acf9",
  },
});

module.exports = {
  generateRandomString,
  generateNumericCode,
  generateReferralCode,
  generateApiKey,
  generateApiSecret,
  generateTransactionId,
  generateOrderId,
  generateTicketId,
  maskEmail,
  maskPhone,
  maskWalletAddress,
  formatCurrency,
  formatPercentage,
  calculatePercentageChange,
  roundToDecimals,
  isInRange,
  paginate,
  sleep,
  retry,
  parseSortQuery,
  buildFilter,
  generateUniqueUsernameRandom,
  computeBotEndDate,
  addDuration,
  toISO,
  safeNumber,
  transporter
};