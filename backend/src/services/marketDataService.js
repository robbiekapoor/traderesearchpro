import axios from 'axios';
import { calculateGreeks, daysToExpiry } from '../utils/greeks.js';

const ALPHA_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  Referer: 'https://finance.yahoo.com/'
};

function seededBasePrice(symbol) {
  const seed = symbol.split('').reduce((acc, char, idx) => acc + (char.charCodeAt(0) * (idx + 1)), 0);
  return 50 + (seed % 450);
}

function buildFallbackFundamentals(symbol) {
  const basePrice = seededBasePrice(symbol);
  const marketCap = Math.round(basePrice * 1_000_000_000);

  return {
    ticker: symbol,
    currentPrice: Number(basePrice.toFixed(2)),
    eps: Number((basePrice / 20).toFixed(2)),
    dividend: Number((basePrice * 0.01).toFixed(2)),
    revenue: marketCap * 0.2,
    netIncome: marketCap * 0.04,
    marketCap,
    peRatio: Number((18 + (basePrice % 10)).toFixed(2)),
    week52High: Number((basePrice * 1.2).toFixed(2)),
    week52Low: Number((basePrice * 0.8).toFixed(2)),
    source: {
      alphaVantage: 'rejected',
      yahooFinance: 'rejected',
      fallback: 'synthetic'
    }
  };
}

function buildFallbackOptions(symbol, expiration) {
  const now = Math.floor(Date.now() / 1000);
  const defaultExpirations = [14, 28, 56].map((days) => now + (days * 24 * 60 * 60));
  const expirations = defaultExpirations;
  const selectedExpiration = expiration ? Number(expiration) : expirations[0];
  const underlyingPrice = seededBasePrice(symbol);
  const strikes = [-3, -2, -1, 0, 1, 2, 3].map((offset) => Number((underlyingPrice + (offset * 5)).toFixed(2)));

  const makeOption = (strike, type) => {
    const moneyness = (strike - underlyingPrice) / underlyingPrice;
    const iv = 0.2 + Math.abs(moneyness);
    const bid = Number((Math.max(0.2, 2.5 - Math.abs(strike - underlyingPrice) / 5)).toFixed(2));
    const ask = Number((bid + 0.1).toFixed(2));

    return normalizeOption({
      contractSymbol: `${symbol}${selectedExpiration}${type === 'call' ? 'C' : 'P'}${String(strike).replace('.', '')}`,
      strike,
      bid,
      ask,
      impliedVolatility: iv,
      openInterest: 200,
      volume: 50,
      inTheMoney: type === 'call' ? strike < underlyingPrice : strike > underlyingPrice
    }, type, underlyingPrice, selectedExpiration);
  };

  const calls = strikes.map((strike) => makeOption(strike, 'call'));
  const puts = strikes.map((strike) => makeOption(strike, 'put'));

  return {
    ticker: symbol,
    underlyingPrice,
    expirations,
    selectedExpiration,
    calls,
    puts,
    highlightedTrades: {
      otmPutsHighPremium: puts.filter((o) => o.strike < underlyingPrice).slice(0, 5),
      otmCallsIvCrush: calls.filter((o) => o.strike > underlyingPrice).slice(0, 5)
    },
    source: {
      fallback: 'synthetic'
    }
  };
}

async function getYahooOptionsResult(symbol, expiration) {
  const baseUrls = [
    `https://query1.finance.yahoo.com/v7/finance/options/${symbol}`,
    `https://query2.finance.yahoo.com/v7/finance/options/${symbol}`
  ];

  const endpointErrors = [];

  for (const baseUrl of baseUrls) {
    try {
      const url = expiration ? `${baseUrl}?date=${Number(expiration)}` : baseUrl;
      const response = await axios.get(url, {
        headers: YAHOO_HEADERS,
        timeout: 10000
      });

      const result = response.data?.optionChain?.result?.[0];
      if (result) return result;
      endpointErrors.push(`${baseUrl}: empty result`);
    } catch (error) {
      const status = error?.response?.status;
      endpointErrors.push(`${baseUrl}: ${status ? `HTTP ${status}` : error.message}`);
    }
  }

  throw new Error(`Unable to fetch Yahoo options data (${endpointErrors.join('; ')}).`);
}

export async function fetchFundamentals(ticker) {
  const symbol = ticker.toUpperCase();

  // Example Alpha Vantage usage for real-time quote
  const alphaQuoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_API_KEY}`;

  // Example Yahoo Finance fundamentals endpoint
  const yahooSummaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price,summaryDetail,defaultKeyStatistics,financialData`;

  const [alphaResp, yahooResp] = await Promise.allSettled([axios.get(alphaQuoteUrl), axios.get(yahooSummaryUrl)]);

  const alphaQuote = alphaResp.status === 'fulfilled' ? alphaResp.value?.data?.['Global Quote'] || {} : {};
  const result = yahooResp.status === 'fulfilled' ? yahooResp.value?.data?.quoteSummary?.result?.[0] : null;

  if (!result && !Object.keys(alphaQuote).length) {
    return buildFallbackFundamentals(symbol);
  }

  const price = result?.price || {};
  const summary = result?.summaryDetail || {};
  const stats = result?.defaultKeyStatistics || {};
  const financial = result?.financialData || {};

  return {
    ticker: symbol,
    currentPrice: Number(price.regularMarketPrice?.raw ?? alphaQuote['05. price'] ?? 0),
    eps: Number(stats.trailingEps?.raw ?? 0),
    dividend: Number(summary.dividendRate?.raw ?? 0),
    revenue: Number(financial.totalRevenue?.raw ?? 0),
    netIncome: Number(financial.netIncomeToCommon?.raw ?? 0),
    marketCap: Number(price.marketCap?.raw ?? 0),
    peRatio: Number(summary.trailingPE?.raw ?? 0),
    week52High: Number(summary.fiftyTwoWeekHigh?.raw ?? 0),
    week52Low: Number(summary.fiftyTwoWeekLow?.raw ?? 0),
    source: {
      alphaVantage: alphaResp.status,
      yahooFinance: yahooResp.status
    }
  };
}

function normalizeOption(option, type, underlyingPrice, expiryUnix) {
  const iv = option.impliedVolatility ?? 0;
  const dte = daysToExpiry(expiryUnix);
  const greeks = calculateGreeks({
    optionType: type,
    S: underlyingPrice,
    K: option.strike,
    sigma: iv,
    t: dte / 365
  });

  const mid = (option.bid + option.ask) / 2;
  const premiumPerDay = dte > 0 ? mid / dte : 0;
  const liquidity = (option.openInterest || 0) + (option.volume || 0);
  const deltaAbs = Math.abs(greeks.delta ?? 0);
  const riskScore = Math.min(100, Math.round((deltaAbs * 50) + ((1 - Math.min(iv, 2)) * 30) + (Math.min(liquidity / 1000, 1) * 20)));

  let riskLevel = 'high';
  if (riskScore >= 70) riskLevel = 'low';
  else if (riskScore >= 40) riskLevel = 'medium';

  const score = Math.round((premiumPerDay * 30) + (Math.min(iv, 2) * 20) + (Math.min(liquidity / 1000, 1) * 30) + ((100 - (deltaAbs * 100)) * 0.2));

  return {
    contractSymbol: option.contractSymbol,
    strike: option.strike,
    bid: option.bid,
    ask: option.ask,
    impliedVolatility: iv,
    openInterest: option.openInterest,
    volume: option.volume,
    inTheMoney: option.inTheMoney,
    premiumPerDay,
    ...greeks,
    score,
    riskLevel
  };
}

export async function fetchOptionsChain(ticker, expiration) {
  const symbol = ticker.toUpperCase();
  let result;
  try {
    result = await getYahooOptionsResult(symbol);
  } catch (_error) {
    return buildFallbackOptions(symbol, expiration);
  }
  if (!result) throw new Error('Unable to fetch options chain.');

  const expirations = result.expirationDates || [];
  const expiryToUse = expiration ? Number(expiration) : expirations[0];

  let chain;
  try {
    chain = await getYahooOptionsResult(symbol, expiryToUse);
  } catch (_error) {
    return buildFallbackOptions(symbol, expiryToUse);
  }
  if (!chain?.options?.[0]) throw new Error('No options found for selected expiry.');

  const optionSet = chain.options[0];
  const underlyingPrice = chain.quote?.regularMarketPrice ?? result.quote?.regularMarketPrice ?? 0;

  const calls = (optionSet.calls || []).map((o) => normalizeOption(o, 'call', underlyingPrice, expiryToUse));
  const puts = (optionSet.puts || []).map((o) => normalizeOption(o, 'put', underlyingPrice, expiryToUse));

  const highlightedTrades = {
    otmPutsHighPremium: puts
      .filter((o) => o.strike < underlyingPrice && !o.inTheMoney)
      .sort((a, b) => b.premiumPerDay - a.premiumPerDay)
      .slice(0, 5),
    otmCallsIvCrush: calls
      .filter((o) => o.strike > underlyingPrice && !o.inTheMoney)
      .sort((a, b) => (b.impliedVolatility - a.impliedVolatility) || (b.score - a.score))
      .slice(0, 5)
  };

  return {
    ticker: symbol,
    underlyingPrice,
    expirations,
    selectedExpiration: expiryToUse,
    calls,
    puts,
    highlightedTrades
  };
}
