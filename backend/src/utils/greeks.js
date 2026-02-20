const SQRT_2PI = Math.sqrt(2 * Math.PI);

function normPdf(x) {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

function normCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) prob = 1 - prob;
  return prob;
}

export function calculateGreeks({ optionType, S, K, sigma, t, r = 0.045 }) {
  if (!S || !K || !sigma || !t || sigma <= 0 || t <= 0) {
    return { delta: null, gamma: null, theta: null, vega: null, rho: null };
  }

  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * t) / (sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);
  const pdf = normPdf(d1);

  const isCall = optionType === 'call';
  const delta = isCall ? normCdf(d1) : normCdf(d1) - 1;
  const gamma = pdf / (S * sigma * Math.sqrt(t));
  const vega = (S * pdf * Math.sqrt(t)) / 100;

  const thetaCall = (-(S * pdf * sigma) / (2 * Math.sqrt(t)) - r * K * Math.exp(-r * t) * normCdf(d2)) / 365;
  const thetaPut = (-(S * pdf * sigma) / (2 * Math.sqrt(t)) + r * K * Math.exp(-r * t) * normCdf(-d2)) / 365;
  const theta = isCall ? thetaCall : thetaPut;

  const rhoCall = (K * t * Math.exp(-r * t) * normCdf(d2)) / 100;
  const rhoPut = (-K * t * Math.exp(-r * t) * normCdf(-d2)) / 100;
  const rho = isCall ? rhoCall : rhoPut;

  return {
    delta,
    gamma,
    theta,
    vega,
    rho,
    probabilityITM: isCall ? normCdf(d2) : normCdf(-d2)
  };
}

export function daysToExpiry(expiryUnix) {
  const now = Date.now();
  const expiry = expiryUnix * 1000;
  const ms = Math.max(expiry - now, 0);
  return Math.max(ms / (1000 * 60 * 60 * 24), 1);
}
