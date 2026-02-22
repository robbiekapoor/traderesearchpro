const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

async function parseError(res, fallback) {
  try {
    const body = await res.json();
    if (body?.message) return body.message;
  } catch (_error) {
    // ignore json parse failures
  }

  return fallback;
}

export async function fetchStock(ticker) {
  const res = await fetch(`${API_BASE}/stock/${ticker}`);
  if (!res.ok) throw new Error(await parseError(res, 'Failed to fetch stock fundamentals'));
  return res.json();
}

export async function fetchOptions(ticker, expiration) {
  const params = new URLSearchParams();
  if (expiration) params.set('expiration', expiration);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/options/${ticker}${suffix}`);
  if (!res.ok) throw new Error(await parseError(res, 'Failed to fetch options chain'));
  return res.json();
}

export async function fetchAnalysis({ question, ticker, fundamentals, options }) {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, ticker, fundamentals, options })
  });
  if (!res.ok) throw new Error(await parseError(res, 'Failed to get AI analysis'));
  return res.json();
}
