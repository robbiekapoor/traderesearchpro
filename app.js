const API_BASE = 'http://localhost:4000/api';

const ids = {
  price: document.getElementById('m-price'),
  pe: document.getElementById('m-pe'),
  eps: document.getElementById('m-eps'),
  cap: document.getElementById('m-cap'),
  status: document.getElementById('status'),
  ideas: document.getElementById('ideas-list'),
  options: document.getElementById('options-list'),
  form: document.getElementById('ticker-form'),
  input: document.getElementById('ticker-input')
};

const moneyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const compactFmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

function setMetric(el, value, formatter = (v) => v) {
  el.textContent = value === null || value === undefined || Number.isNaN(value) ? 'N/A' : formatter(value);
}

function renderList(el, rows, fallback) {
  el.innerHTML = '';
  if (!rows?.length) {
    const li = document.createElement('li');
    li.textContent = fallback;
    el.appendChild(li);
    return;
  }
  rows.forEach((row) => {
    const li = document.createElement('li');
    li.innerHTML = row;
    el.appendChild(li);
  });
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function loadTicker(ticker) {
  ids.status.textContent = `Loading ${ticker}...`;
  const symbol = ticker.toUpperCase().trim();
  try {
    const [stock, options] = await Promise.all([
      fetchJson(`${API_BASE}/stock/${symbol}`),
      fetchJson(`${API_BASE}/options/${symbol}`)
    ]);

    setMetric(ids.price, stock.price, (v) => moneyFmt.format(v));
    setMetric(ids.pe, stock.peRatio, (v) => Number(v).toFixed(2));
    setMetric(ids.eps, stock.eps, (v) => Number(v).toFixed(2));
    setMetric(ids.cap, stock.marketCap, (v) => `$${compactFmt.format(v)}`);

    const highlighted = options.highlightedTrades || {};
    renderList(
      ids.ideas,
      [
        ...(highlighted.otmPutsHighPremium || []).slice(0, 3).map((o) => `${o.contractSymbol} <span class="small">PPD ${o.premiumPerDay?.toFixed(3)}</span>`),
        ...(highlighted.otmCallsIvCrush || []).slice(0, 3).map((o) => `${o.contractSymbol} <span class="small">IV ${o.impliedVolatility?.toFixed(2)}</span>`)
      ],
      'No highlighted trade ideas returned.'
    );

    const contracts = [...(options.calls || []).slice(0, 3), ...(options.puts || []).slice(0, 3)];
    renderList(
      ids.options,
      contracts.map((o) => `${o.contractSymbol} · Bid ${o.bid ?? 'N/A'} / Ask ${o.ask ?? 'N/A'} · Δ ${o.delta ?? 'N/A'}`),
      'No options contracts returned.'
    );

    ids.status.textContent = `Loaded ${symbol}.`;
  } catch (err) {
    ids.status.textContent = `Could not load live data from backend for ${symbol}. (${err.message})`;
    setMetric(ids.price, null);
    setMetric(ids.pe, null);
    setMetric(ids.eps, null);
    setMetric(ids.cap, null);
    renderList(ids.ideas, [], 'Start backend on localhost:4000 to see trade ideas.');
    renderList(ids.options, [], 'Start backend on localhost:4000 to see options contracts.');
  }
}

ids.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await loadTicker(ids.input.value);
});

loadTicker(ids.input.value);
