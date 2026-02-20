const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export async function fetchStock(ticker) {
  const res = await fetch(`${API_BASE}/stock/${ticker}`);
  if (!res.ok) throw new Error('Failed to fetch stock fundamentals');
  return res.json();
}

export async function fetchOptions(ticker, expiration) {
  const url = new URL(`${API_BASE}/options/${ticker}`);
  if (expiration) url.searchParams.set('expiration', expiration);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch options chain');
  return res.json();
}
