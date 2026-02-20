const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

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
  const url = new URL(`${API_BASE}/options/${ticker}`);
  if (expiration) url.searchParams.set('expiration', expiration);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(await parseError(res, 'Failed to fetch options chain'));
  return res.json();
}
