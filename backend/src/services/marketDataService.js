import axios from 'axios';
import { calculateGreeks, daysToExpiry } from '../utils/greeks.js';

const ALPHA_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';

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
    throw new Error('Unable to fetch market data for this ticker.');
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
  const baseUrl = `https://query1.finance.yahoo.com/v7/finance/options/${symbol}`;

  const first = await axios.get(baseUrl);
  const result = first.data?.optionChain?.result?.[0];
  if (!result) throw new Error('Unable to fetch options chain.');

  const expirations = result.expirationDates || [];
  const expiryToUse = expiration ? Number(expiration) : expirations[0];

  const chainResp = await axios.get(`${baseUrl}?date=${expiryToUse}`);
  const chain = chainResp.data?.optionChain?.result?.[0];
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
