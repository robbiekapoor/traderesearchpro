import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import NodeCache from 'node-cache';
import { calculateGreeks, daysToExpiry } from '../utils/greeks.js';

const optionsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const fundamentalsCache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

// Strict attempt tracking: stop hitting Yahoo after 5 failures
let yahooFailures = 0;
const MAX_FAILURES = 5;
let yahooDisabledUntil = 0;
const COOLDOWN_MS = 30 * 60 * 1000; // 30 min cooldown after 5 failures

function isYahooAvailable() {
  if (yahooFailures < MAX_FAILURES) return true;
  if (Date.now() > yahooDisabledUntil) {
    yahooFailures = 0;
    console.log('[Yahoo] Cooldown expired, re-enabling API calls');
    return true;
  }
  return false;
}

function recordYahooFailure(err) {
  yahooFailures++;
  console.log(`[Yahoo] Failure ${yahooFailures}/${MAX_FAILURES}: ${err.message}`);
  if (yahooFailures >= MAX_FAILURES) {
    yahooDisabledUntil = Date.now() + COOLDOWN_MS;
    console.log(`[Yahoo] Max failures reached. Disabled for 30 minutes. Using fallback data.`);
  }
}

function recordYahooSuccess() {
  yahooFailures = 0;
}

// ── Fallback data generators ──

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
    source: { fallback: 'synthetic' }
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
    source: { fallback: 'synthetic' }
  };
}

// ── Normalize + enrich option data ──

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

// ── Public API: Fundamentals ──

export async function fetchFundamentals(ticker) {
  const symbol = ticker.toUpperCase();
  const cacheKey = `fundamentals_${symbol}`;

  const cached = fundamentalsCache.get(cacheKey);
  if (cached) {
    console.log(`[Cache Hit] Fundamentals for ${symbol}`);
    return { ...cached, cached: true, cachedAt: cached._cachedAt };
  }

  if (!isYahooAvailable()) {
    console.log(`[Yahoo Disabled] Using fallback for ${symbol} fundamentals`);
    return buildFallbackFundamentals(symbol);
  }

  try {
    console.log(`[Yahoo] Fetching fundamentals for ${symbol}...`);
    const quote = await yahooFinance.quote(symbol);
    recordYahooSuccess();

    const price = quote.regularMarketPrice ?? 0;
    let divRate = quote.dividendRate
      ?? quote.trailingAnnualDividendRate
      ?? 0;
    let divYieldRaw = quote.dividendYield
      ?? quote.trailingAnnualDividendYield
      ?? 0;

    // Normalize yield to percentage (e.g. 0.39 means 0.39%)
    // yahoo-finance2 returns decimals like 0.0039 for 0.39%
    let divYield = divYieldRaw > 0 && divYieldRaw < 1
      ? divYieldRaw * 100
      : divYieldRaw;

    if (!divRate && divYield > 0 && price > 0) {
      divRate = price * (divYield / 100);
    }
    if (divRate > 0 && !divYield && price > 0) {
      divYield = (divRate / price) * 100;
    }

    const data = {
      ticker: symbol,
      displayName: quote.shortName || quote.longName || symbol,
      quoteType: quote.quoteType || 'EQUITY',
      currentPrice: price,
      open: quote.regularMarketOpen ?? 0,
      dayHigh: quote.regularMarketDayHigh ?? 0,
      dayLow: quote.regularMarketDayLow ?? 0,
      volume: quote.regularMarketVolume ?? 0,
      previousClose: quote.regularMarketPreviousClose ?? 0,
      dayChange: quote.regularMarketChange ?? 0,
      dayChangePercent: quote.regularMarketChangePercent ?? 0,
      eps: quote.epsTrailingTwelveMonths ?? 0,
      beta: quote.beta ?? 0,
      dividend: divRate,
      dividendYield: divYield,
      revenue: quote.revenue ?? 0,
      netIncome: 0,
      marketCap: quote.marketCap ?? 0,
      peRatio: quote.trailingPE ?? 0,
      forwardPE: quote.forwardPE ?? 0,
      week52High: quote.fiftyTwoWeekHigh ?? 0,
      week52Low: quote.fiftyTwoWeekLow ?? 0,
      fiftyDayAvg: quote.fiftyDayAverage ?? 0,
      twoHundredDayAvg: quote.twoHundredDayAverage ?? 0,
      avgVolume: quote.averageDailyVolume3Month ?? 0,
      source: { yahooFinance: 'success', real: true },
      _cachedAt: new Date().toISOString()
    };

    fundamentalsCache.set(cacheKey, data);
    console.log(`[Cache Miss] Fetched and cached fundamentals for ${symbol}`);
    return { ...data, cached: false };
  } catch (err) {
    recordYahooFailure(err);
    return buildFallbackFundamentals(symbol);
  }
}

// ── Public API: Options Chain ──

export async function fetchOptionsChain(ticker, expiration) {
  const symbol = ticker.toUpperCase();
  const cacheKey = `options_${symbol}_${expiration || 'default'}`;

  const cached = optionsCache.get(cacheKey);
  if (cached) {
    console.log(`[Cache Hit] Options chain for ${symbol} (exp: ${expiration || 'default'})`);
    return { ...cached, cached: true, cachedAt: cached._cachedAt };
  }

  if (!isYahooAvailable()) {
    console.log(`[Yahoo Disabled] Using fallback for ${symbol} options`);
    return buildFallbackOptions(symbol, expiration);
  }

  try {
    console.log(`[Yahoo] Fetching options chain for ${symbol}...`);
    const queryOpts = {};
    if (expiration) queryOpts.date = new Date(Number(expiration) * 1000);

    const result = await yahooFinance.options(symbol, queryOpts);
    recordYahooSuccess();

    if (!result || !result.options || result.options.length === 0) {
      console.log(`[Yahoo] No options data returned for ${symbol}`);
      return buildFallbackOptions(symbol, expiration);
    }

    const expirations = (result.expirationDates || []).map(d =>
      Math.floor(new Date(d).getTime() / 1000)
    );
    const optionSet = result.options[0];
    const underlyingPrice = result.quote?.regularMarketPrice ?? 0;
    const expiryToUse = expiration ? Number(expiration) : expirations[0];

    const mapOption = (o, type) => normalizeOption({
      contractSymbol: o.contractSymbol,
      strike: o.strike,
      bid: o.bid ?? 0,
      ask: o.ask ?? 0,
      impliedVolatility: o.impliedVolatility ?? 0,
      openInterest: o.openInterest ?? 0,
      volume: o.volume ?? 0,
      inTheMoney: o.inTheMoney ?? false
    }, type, underlyingPrice, expiryToUse);

    const calls = (optionSet.calls || []).map((o) => mapOption(o, 'call'));
    const puts = (optionSet.puts || []).map((o) => mapOption(o, 'put'));

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

    const data = {
      ticker: symbol,
      underlyingPrice,
      expirations,
      selectedExpiration: expiryToUse,
      calls,
      puts,
      highlightedTrades,
      source: { yahooFinance: 'success', real: true },
      _cachedAt: new Date().toISOString()
    };

    optionsCache.set(cacheKey, data);
    console.log(`[Cache Miss] Fetched and cached options chain for ${symbol} (${calls.length} calls, ${puts.length} puts)`);
    return { ...data, cached: false };
  } catch (err) {
    recordYahooFailure(err);
    return buildFallbackOptions(symbol, expiration);
  }
}
