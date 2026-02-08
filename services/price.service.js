/**
 * Price Service
 * Handles external price data from CoinGecko, Binance, and other providers
 */

const logger = require('../config/logger');
const { formatNumber, formatCurrency } = require('../utils/helpers');

class PriceService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = {
      prices: 30 * 1000,        // 30 seconds for current prices
      historical: 5 * 60 * 1000, // 5 minutes for historical data
      marketCap: 60 * 1000,     // 1 minute for market cap
      trending: 5 * 60 * 1000   // 5 minutes for trending
    };
    
    this.providers = {
      coingecko: {
        baseUrl: 'https://api.coingecko.com/api/v3',
        rateLimit: 50, // calls per minute
        lastCall: 0
      },
      binance: {
        baseUrl: 'https://api.binance.com/api/v3',
        rateLimit: 1200, // calls per minute
        lastCall: 0
      }
    };

    this.symbolToCoingeckoId = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDT': 'tether',
      'USDC': 'usd-coin',
      'BNB': 'binancecoin',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'SOL': 'solana',
      'DOGE': 'dogecoin',
      'DOT': 'polkadot',
      'MATIC': 'matic-network',
      'LTC': 'litecoin',
      'SHIB': 'shiba-inu',
      'TRX': 'tron',
      'AVAX': 'avalanche-2',
      'LINK': 'chainlink',
      'ATOM': 'cosmos',
      'UNI': 'uniswap',
      'XMR': 'monero',
      'ETC': 'ethereum-classic',
      'XLM': 'stellar',
      'BCH': 'bitcoin-cash',
      'APT': 'aptos',
      'NEAR': 'near',
      'FIL': 'filecoin',
      'LDO': 'lido-dao',
      'ARB': 'arbitrum',
      'OP': 'optimism',
      'INJ': 'injective-protocol',
      'RENDER': 'render-token'
    };
  }

  /**
   * Rate limiter for API calls
   */
  async rateLimitWait(provider) {
    const config = this.providers[provider];
    if (!config) return;

    const minInterval = 60000 / config.rateLimit;
    const timeSinceLastCall = Date.now() - config.lastCall;
    
    if (timeSinceLastCall < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastCall));
    }
    
    config.lastCall = Date.now();
  }

  /**
   * Get cached data or fetch fresh
   */
  getCached(key, ttlType) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL[ttlType]) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cache data
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Fetch with timeout and retry
   */
  async fetchWithRetry(url, options = {}, retries = 3) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            ...options.headers
          }
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  /**
   * Get current price for a single cryptocurrency
   */
  async getPrice(symbol, currency = 'USD') {
    const cacheKey = `price:${symbol}:${currency}`;
    const cached = this.getCached(cacheKey, 'prices');
    if (cached) return cached;

    try {
      // Try Binance first (faster)
      const price = await this.getBinancePrice(symbol, currency);
      this.setCache(cacheKey, price);
      return price;
    } catch (error) {
      logger.warn(`Binance price fetch failed for ${symbol}, trying CoinGecko`);
      
      try {
        const price = await this.getCoinGeckoPrice(symbol, currency);
        this.setCache(cacheKey, price);
        return price;
      } catch (cgError) {
        logger.error(`All price providers failed for ${symbol}:`, cgError);
        throw new Error(`Unable to fetch price for ${symbol}`);
      }
    }
  }

  /**
   * Get prices for multiple cryptocurrencies
   */
  async getPrices(symbols, currency = 'USD') {
    const cacheKey = `prices:${symbols.sort().join(',')}:${currency}`;
    const cached = this.getCached(cacheKey, 'prices');
    if (cached) return cached;

    try {
      const prices = await this.getCoinGeckoPrices(symbols, currency);
      this.setCache(cacheKey, prices);
      return prices;
    } catch (error) {
      logger.error('Failed to fetch multiple prices:', error);
      
      // Fallback to individual fetches
      const results = {};
      for (const symbol of symbols) {
        try {
          results[symbol] = await this.getPrice(symbol, currency);
        } catch (e) {
          results[symbol] = null;
        }
      }
      return results;
    }
  }

  /**
   * Get price from Binance
   */
  async getBinancePrice(symbol, currency = 'USD') {
    await this.rateLimitWait('binance');

    // Binance uses USDT for most pairs
    const quoteCurrency = currency === 'USD' ? 'USDT' : currency;
    const pair = `${symbol}${quoteCurrency}`;

    const data = await this.fetchWithRetry(
      `${this.providers.binance.baseUrl}/ticker/24hr?symbol=${pair}`
    );

    return {
      symbol,
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChange),
      changePercent24h: parseFloat(data.priceChangePercent),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      volume24h: parseFloat(data.volume),
      quoteVolume24h: parseFloat(data.quoteVolume),
      updatedAt: new Date(data.closeTime).toISOString()
    };
  }

  /**
   * Get price from CoinGecko
   */
  async getCoinGeckoPrice(symbol, currency = 'USD') {
    await this.rateLimitWait('coingecko');

    const coinId = this.symbolToCoingeckoId[symbol.toUpperCase()];
    if (!coinId) {
      throw new Error(`Unknown cryptocurrency: ${symbol}`);
    }

    const data = await this.fetchWithRetry(
      `${this.providers.coingecko.baseUrl}/simple/price?ids=${coinId}&vs_currencies=${currency.toLowerCase()}&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
    );

    const coinData = data[coinId];
    const curr = currency.toLowerCase();

    return {
      symbol,
      price: coinData[curr],
      change24h: null,
      changePercent24h: coinData[`${curr}_24h_change`],
      high24h: null,
      low24h: null,
      volume24h: coinData[`${curr}_24h_vol`],
      marketCap: coinData[`${curr}_market_cap`],
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Get multiple prices from CoinGecko
   */
  async getCoinGeckoPrices(symbols, currency = 'USD') {
    await this.rateLimitWait('coingecko');

    const coinIds = symbols
      .map(s => this.symbolToCoingeckoId[s.toUpperCase()])
      .filter(Boolean);

    if (coinIds.length === 0) {
      throw new Error('No valid cryptocurrency symbols provided');
    }

    const data = await this.fetchWithRetry(
      `${this.providers.coingecko.baseUrl}/simple/price?ids=${coinIds.join(',')}&vs_currencies=${currency.toLowerCase()}&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
    );

    const results = {};
    const curr = currency.toLowerCase();

    for (const symbol of symbols) {
      const coinId = this.symbolToCoingeckoId[symbol.toUpperCase()];
      if (coinId && data[coinId]) {
        results[symbol] = {
          symbol,
          price: data[coinId][curr],
          changePercent24h: data[coinId][`${curr}_24h_change`],
          volume24h: data[coinId][`${curr}_24h_vol`],
          marketCap: data[coinId][`${curr}_market_cap`]
        };
      }
    }

    return results;
  }

  /**
   * Get historical price data (OHLCV)
   */
  async getHistoricalPrices(symbol, interval = '1d', limit = 100) {
    const cacheKey = `history:${symbol}:${interval}:${limit}`;
    const cached = this.getCached(cacheKey, 'historical');
    if (cached) return cached;

    try {
      // Use Binance for candle data
      const data = await this.getBinanceCandles(symbol, interval, limit);
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      logger.warn(`Binance candles failed for ${symbol}, trying CoinGecko`);
      
      const data = await this.getCoinGeckoHistory(symbol, this.intervalToDays(interval, limit));
      this.setCache(cacheKey, data);
      return data;
    }
  }

  /**
   * Get candles from Binance
   */
  async getBinanceCandles(symbol, interval, limit) {
    await this.rateLimitWait('binance');

    const binanceInterval = this.toBinanceInterval(interval);
    const pair = `${symbol}USDT`;

    const data = await this.fetchWithRetry(
      `${this.providers.binance.baseUrl}/klines?symbol=${pair}&interval=${binanceInterval}&limit=${limit}`
    );

    return data.map(candle => ({
      timestamp: new Date(candle[0]).toISOString(),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
      closeTime: new Date(candle[6]).toISOString(),
      quoteVolume: parseFloat(candle[7]),
      trades: candle[8]
    }));
  }

  /**
   * Get historical data from CoinGecko
   */
  async getCoinGeckoHistory(symbol, days) {
    await this.rateLimitWait('coingecko');

    const coinId = this.symbolToCoingeckoId[symbol.toUpperCase()];
    if (!coinId) {
      throw new Error(`Unknown cryptocurrency: ${symbol}`);
    }

    const data = await this.fetchWithRetry(
      `${this.providers.coingecko.baseUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    );

    return data.prices.map(([timestamp, price], i) => ({
      timestamp: new Date(timestamp).toISOString(),
      price,
      volume: data.total_volumes[i] ? data.total_volumes[i][1] : null,
      marketCap: data.market_caps[i] ? data.market_caps[i][1] : null
    }));
  }

  /**
   * Get order book from Binance
   */
  async getOrderBook(symbol, limit = 100) {
    await this.rateLimitWait('binance');

    const pair = `${symbol}USDT`;
    
    const data = await this.fetchWithRetry(
      `${this.providers.binance.baseUrl}/depth?symbol=${pair}&limit=${limit}`
    );

    return {
      bids: data.bids.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity)
      })),
      asks: data.asks.map(([price, quantity]) => ({
        price: parseFloat(price),
        quantity: parseFloat(quantity)
      })),
      lastUpdateId: data.lastUpdateId
    };
  }

  /**
   * Get recent trades from Binance
   */
  async getRecentTrades(symbol, limit = 100) {
    await this.rateLimitWait('binance');

    const pair = `${symbol}USDT`;
    
    const data = await this.fetchWithRetry(
      `${this.providers.binance.baseUrl}/trades?symbol=${pair}&limit=${limit}`
    );

    return data.map(trade => ({
      id: trade.id,
      price: parseFloat(trade.price),
      quantity: parseFloat(trade.qty),
      quoteQuantity: parseFloat(trade.quoteQty),
      time: new Date(trade.time).toISOString(),
      isBuyerMaker: trade.isBuyerMaker,
      side: trade.isBuyerMaker ? 'sell' : 'buy'
    }));
  }

  /**
   * Get market overview
   */
  async getMarketOverview() {
    const cacheKey = 'market:overview';
    const cached = this.getCached(cacheKey, 'marketCap');
    if (cached) return cached;

    await this.rateLimitWait('coingecko');

    const [globalData, trendingData] = await Promise.all([
      this.fetchWithRetry(`${this.providers.coingecko.baseUrl}/global`),
      this.fetchWithRetry(`${this.providers.coingecko.baseUrl}/search/trending`)
    ]);

    const overview = {
      totalMarketCap: globalData.data.total_market_cap.usd,
      totalVolume24h: globalData.data.total_volume.usd,
      marketCapChange24h: globalData.data.market_cap_change_percentage_24h_usd,
      btcDominance: globalData.data.market_cap_percentage.btc,
      ethDominance: globalData.data.market_cap_percentage.eth,
      activeCryptocurrencies: globalData.data.active_cryptocurrencies,
      markets: globalData.data.markets,
      trending: trendingData.coins.slice(0, 7).map(item => ({
        id: item.item.id,
        name: item.item.name,
        symbol: item.item.symbol,
        marketCapRank: item.item.market_cap_rank,
        thumb: item.item.thumb
      })),
      updatedAt: new Date().toISOString()
    };

    this.setCache(cacheKey, overview);
    return overview;
  }

  /**
   * Get top cryptocurrencies by market cap
   */
  async getTopCryptos(limit = 100) {
    const cacheKey = `top:${limit}`;
    const cached = this.getCached(cacheKey, 'marketCap');
    if (cached) return cached;

    await this.rateLimitWait('coingecko');

    const data = await this.fetchWithRetry(
      `${this.providers.coingecko.baseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=1h,24h,7d`
    );

    const cryptos = data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      currentPrice: coin.current_price,
      marketCap: coin.market_cap,
      marketCapRank: coin.market_cap_rank,
      fullyDilutedValuation: coin.fully_diluted_valuation,
      totalVolume: coin.total_volume,
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      priceChange24h: coin.price_change_24h,
      priceChangePercent24h: coin.price_change_percentage_24h,
      priceChangePercent1h: coin.price_change_percentage_1h_in_currency,
      priceChangePercent7d: coin.price_change_percentage_7d_in_currency,
      circulatingSupply: coin.circulating_supply,
      totalSupply: coin.total_supply,
      maxSupply: coin.max_supply,
      ath: coin.ath,
      athChangePercent: coin.ath_change_percentage,
      athDate: coin.ath_date,
      atl: coin.atl,
      atlChangePercent: coin.atl_change_percentage,
      atlDate: coin.atl_date,
      sparkline: coin.sparkline_in_7d?.price || []
    }));

    this.setCache(cacheKey, cryptos);
    return cryptos;
  }

  /**
   * Get cryptocurrency details
   */
  async getCryptoDetails(symbol) {
    const coinId = this.symbolToCoingeckoId[symbol.toUpperCase()];
    if (!coinId) {
      throw new Error(`Unknown cryptocurrency: ${symbol}`);
    }

    const cacheKey = `details:${coinId}`;
    const cached = this.getCached(cacheKey, 'historical');
    if (cached) return cached;

    await this.rateLimitWait('coingecko');

    const data = await this.fetchWithRetry(
      `${this.providers.coingecko.baseUrl}/coins/${coinId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=true&sparkline=true`
    );

    const details = {
      id: data.id,
      symbol: data.symbol.toUpperCase(),
      name: data.name,
      description: data.description?.en || '',
      image: data.image,
      links: {
        homepage: data.links?.homepage?.[0],
        blockchain: data.links?.blockchain_site?.filter(Boolean),
        repos: data.links?.repos_url?.github,
        twitter: data.links?.twitter_screen_name ? `https://twitter.com/${data.links.twitter_screen_name}` : null,
        reddit: data.links?.subreddit_url,
        telegram: data.links?.telegram_channel_identifier ? `https://t.me/${data.links.telegram_channel_identifier}` : null
      },
      marketData: {
        currentPrice: data.market_data?.current_price?.usd,
        marketCap: data.market_data?.market_cap?.usd,
        marketCapRank: data.market_cap_rank,
        totalVolume: data.market_data?.total_volume?.usd,
        high24h: data.market_data?.high_24h?.usd,
        low24h: data.market_data?.low_24h?.usd,
        priceChange24h: data.market_data?.price_change_24h,
        priceChangePercent24h: data.market_data?.price_change_percentage_24h,
        priceChangePercent7d: data.market_data?.price_change_percentage_7d,
        priceChangePercent30d: data.market_data?.price_change_percentage_30d,
        circulatingSupply: data.market_data?.circulating_supply,
        totalSupply: data.market_data?.total_supply,
        maxSupply: data.market_data?.max_supply,
        ath: data.market_data?.ath?.usd,
        athDate: data.market_data?.ath_date?.usd,
        athChangePercent: data.market_data?.ath_change_percentage?.usd,
        atl: data.market_data?.atl?.usd,
        atlDate: data.market_data?.atl_date?.usd,
        atlChangePercent: data.market_data?.atl_change_percentage?.usd
      },
      sparkline: data.market_data?.sparkline_7d?.price || [],
      communityData: {
        twitterFollowers: data.community_data?.twitter_followers,
        redditSubscribers: data.community_data?.reddit_subscribers,
        telegramUsers: data.community_data?.telegram_channel_user_count
      },
      developerData: {
        forks: data.developer_data?.forks,
        stars: data.developer_data?.stars,
        subscribers: data.developer_data?.subscribers,
        totalIssues: data.developer_data?.total_issues,
        closedIssues: data.developer_data?.closed_issues,
        pullRequestsMerged: data.developer_data?.pull_requests_merged,
        commitCount4Weeks: data.developer_data?.commit_count_4_weeks
      },
      categories: data.categories || [],
      genesisDate: data.genesis_date,
      updatedAt: data.last_updated
    };

    this.setCache(cacheKey, details);
    return details;
  }

  /**
   * Search cryptocurrencies
   */
  async searchCryptos(query) {
    await this.rateLimitWait('coingecko');

    const data = await this.fetchWithRetry(
      `${this.providers.coingecko.baseUrl}/search?query=${encodeURIComponent(query)}`
    );

    return {
      coins: data.coins.slice(0, 20).map(coin => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        marketCapRank: coin.market_cap_rank,
        thumb: coin.thumb
      })),
      exchanges: data.exchanges.slice(0, 10).map(exchange => ({
        id: exchange.id,
        name: exchange.name,
        marketType: exchange.market_type,
        thumb: exchange.thumb
      }))
    };
  }

  /**
   * Convert price between cryptocurrencies
   */
  async convertPrice(fromSymbol, toSymbol, amount) {
    const [fromPrice, toPrice] = await Promise.all([
      this.getPrice(fromSymbol),
      this.getPrice(toSymbol)
    ]);

    const fromUsd = amount * fromPrice.price;
    const toAmount = fromUsd / toPrice.price;

    return {
      from: {
        symbol: fromSymbol,
        amount,
        usdValue: fromUsd
      },
      to: {
        symbol: toSymbol,
        amount: toAmount,
        usdValue: fromUsd
      },
      rate: fromPrice.price / toPrice.price,
      inverseRate: toPrice.price / fromPrice.price
    };
  }

  /**
   * Get exchange rates
   */
  async getExchangeRates() {
    const cacheKey = 'exchange:rates';
    const cached = this.getCached(cacheKey, 'prices');
    if (cached) return cached;

    await this.rateLimitWait('coingecko');

    const data = await this.fetchWithRetry(
      `${this.providers.coingecko.baseUrl}/exchange_rates`
    );

    const rates = {};
    for (const [key, value] of Object.entries(data.rates)) {
      rates[key.toUpperCase()] = {
        name: value.name,
        unit: value.unit,
        value: value.value,
        type: value.type
      };
    }

    this.setCache(cacheKey, rates);
    return rates;
  }

  /**
   * Helper: Convert interval to Binance format
   */
  toBinanceInterval(interval) {
    const map = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
      '1w': '1w',
      '1M': '1M'
    };
    return map[interval] || '1d';
  }

  /**
   * Helper: Convert interval and limit to days
   */
  intervalToDays(interval, limit) {
    const multipliers = {
      '1m': 1 / 1440,
      '5m': 5 / 1440,
      '15m': 15 / 1440,
      '30m': 30 / 1440,
      '1h': 1 / 24,
      '4h': 4 / 24,
      '1d': 1,
      '1w': 7,
      '1M': 30
    };
    return Math.ceil((multipliers[interval] || 1) * limit);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Price service cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
module.exports = new PriceService();
