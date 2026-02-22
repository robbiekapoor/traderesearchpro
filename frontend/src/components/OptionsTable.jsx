import { useState, useMemo } from 'react';

const riskColor = {
  low: 'text-emerald-400 bg-emerald-500/10',
  medium: 'text-yellow-400 bg-yellow-500/10',
  high: 'text-red-400 bg-red-500/10'
};

const show = (n, digits = 2) => (Number.isFinite(n) ? Number(n).toFixed(digits) : '—');

const COLUMNS = [
  { key: 'strike', label: 'Strike', digits: 2, tooltip: 'The price at which the option can be exercised' },
  { key: 'bid', label: 'Bid', digits: 2, tooltip: 'Highest price a buyer is willing to pay' },
  { key: 'ask', label: 'Ask', digits: 2, tooltip: 'Lowest price a seller is willing to accept' },
  { key: 'impliedVolatility', label: 'IV', digits: 3, tooltip: 'Implied Volatility — market\'s expectation of future price movement' },
  { key: 'delta', label: 'Delta', digits: 3, tooltip: 'Rate of change in option price per $1 change in underlying' },
  { key: 'gamma', label: 'Gamma', digits: 4, tooltip: 'Rate of change of delta per $1 change in underlying' },
  { key: 'theta', label: 'Theta', digits: 3, tooltip: 'Daily time decay — how much value the option loses per day' },
  { key: 'vega', label: 'Vega', digits: 3, tooltip: 'Sensitivity to a 1% change in implied volatility' },
  { key: 'openInterest', label: 'OI', digits: 0, tooltip: 'Open Interest — total number of outstanding contracts' },
  { key: 'volume', label: 'Vol', digits: 0, tooltip: 'Number of contracts traded today' },
  { key: 'score', label: 'Score', digits: 0, tooltip: 'Composite score based on premium, IV, and liquidity' },
  { key: 'riskLevel', label: 'Risk', tooltip: 'Risk level based on delta, IV, and liquidity' }
];

function SortArrow({ active, direction }) {
  if (!active) return <span className="text-slate-600 ml-1">↕</span>;
  return <span className="text-blue-400 ml-1">{direction === 'asc' ? '↑' : '↓'}</span>;
}

function Table({ options, minDelta, maxDelta, underlyingPrice, type }) {
  const [sortKey, setSortKey] = useState('strike');
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'strike' ? 'asc' : 'desc');
    }
  };

  const filtered = useMemo(() => {
    let result = options.filter((o) => {
      const d = Math.abs(o.delta ?? 0);
      return d >= minDelta && d <= maxDelta;
    });

    result.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });

    return result;
  }, [options, minDelta, maxDelta, sortKey, sortDir]);

  const summary = useMemo(() => {
    if (!filtered.length) return null;
    const avgIv = filtered.reduce((s, o) => s + (o.impliedVolatility ?? 0), 0) / filtered.length;
    const totalVol = filtered.reduce((s, o) => s + (o.volume ?? 0), 0);
    const nearestATM = filtered.reduce((best, o) =>
      Math.abs(o.strike - underlyingPrice) < Math.abs(best.strike - underlyingPrice) ? o : best
    , filtered[0]);
    return { count: filtered.length, avgIv, totalVol, atmStrike: nearestATM?.strike };
  }, [filtered, underlyingPrice]);

  return (
    <div>
      {summary && (
        <div className="flex flex-wrap gap-4 text-xs text-slate-400 mb-3 px-1">
          <span><span className="text-slate-300 font-medium">{summary.count}</span> contracts</span>
          <span>Avg IV: <span className="text-slate-300 font-medium">{(summary.avgIv * 100).toFixed(1)}%</span></span>
          <span>Total Vol: <span className="text-slate-300 font-medium">{summary.totalVol.toLocaleString()}</span></span>
          {summary.atmStrike && <span>ATM: <span className="text-slate-300 font-medium">${summary.atmStrike}</span></span>}
        </div>
      )}

      <div className="overflow-auto max-h-[500px] border border-slate-800 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-slate-900/90 sticky top-0 z-10">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  title={col.tooltip}
                  className="p-2 text-left cursor-pointer select-none hover:text-blue-300 transition-colors whitespace-nowrap"
                >
                  {col.label}
                  <SortArrow active={sortKey === col.key} direction={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={COLUMNS.length} className="p-6 text-center text-slate-500">No contracts match the current delta filter.</td></tr>
            )}
            {filtered.map((o) => {
              const isITM = o.inTheMoney;
              const rowBg = isITM
                ? type === 'call' ? 'bg-emerald-500/[0.04]' : 'bg-red-500/[0.04]'
                : '';

              return (
                <tr
                  key={o.contractSymbol}
                  className={`border-t border-slate-800/60 hover:bg-slate-800/50 transition-colors ${rowBg}`}
                >
                  <td className="p-2 font-medium">
                    ${show(o.strike)}
                    {isITM && <span className="ml-1.5 text-[9px] font-semibold text-blue-400">ITM</span>}
                  </td>
                  <td className="p-2">{show(o.bid)}</td>
                  <td className="p-2">{show(o.ask)}</td>
                  <td className="p-2">{o.impliedVolatility ? (o.impliedVolatility * 100).toFixed(1) + '%' : '—'}</td>
                  <td className="p-2">{show(o.delta, 3)}</td>
                  <td className="p-2">{show(o.gamma, 4)}</td>
                  <td className="p-2 text-red-300">{show(o.theta, 3)}</td>
                  <td className="p-2">{show(o.vega, 3)}</td>
                  <td className="p-2">{o.openInterest?.toLocaleString() ?? '—'}</td>
                  <td className="p-2">{o.volume?.toLocaleString() ?? '—'}</td>
                  <td className="p-2 font-semibold">{o.score}</td>
                  <td className="p-2">
                    <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${riskColor[o.riskLevel]}`}>
                      {o.riskLevel?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OptionsTable({ data, deltaRange, setDeltaRange, expiration, setExpiration }) {
  const [chainTab, setChainTab] = useState('calls');

  if (!data) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <p>No options data yet. Search a ticker to get started.</p>
    </div>
  );

  const [minDelta, maxDelta] = deltaRange;

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-slate-400 text-[11px] uppercase tracking-wide font-medium">Expiration</label>
          <select
            value={expiration || data.selectedExpiration}
            onChange={(e) => setExpiration(e.target.value)}
            className="block bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:border-blue-500"
          >
            {data.expirations.map((exp) => (
              <option key={exp} value={exp}>{new Date(exp * 1000).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: '2-digit', day: '2-digit', year: 'numeric' })}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-slate-400 text-[11px] uppercase tracking-wide font-medium">Delta Min</label>
          <input
            type="number" min="0" max="1" step="0.01"
            value={minDelta}
            onChange={(e) => setDeltaRange([Number(e.target.value), maxDelta])}
            className="block bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mt-1 w-24 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-slate-400 text-[11px] uppercase tracking-wide font-medium">Delta Max</label>
          <input
            type="number" min="0" max="1" step="0.01"
            value={maxDelta}
            onChange={(e) => setDeltaRange([minDelta, Number(e.target.value)])}
            className="block bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 mt-1 w-24 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="ml-auto text-xs text-slate-500">
          {data.calls?.length || 0} calls &middot; {data.puts?.length || 0} puts
        </div>
      </div>

      {/* Calls / Puts Toggle */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setChainTab('calls')}
          className={`px-5 py-2 text-sm font-medium rounded-md transition ${
            chainTab === 'calls'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Calls
        </button>
        <button
          onClick={() => setChainTab('puts')}
          className={`px-5 py-2 text-sm font-medium rounded-md transition ${
            chainTab === 'puts'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Puts
        </button>
      </div>

      {/* Table */}
      {chainTab === 'calls' && (
        <Table options={data.calls} minDelta={minDelta} maxDelta={maxDelta} underlyingPrice={data.underlyingPrice} type="call" />
      )}
      {chainTab === 'puts' && (
        <Table options={data.puts} minDelta={minDelta} maxDelta={maxDelta} underlyingPrice={data.underlyingPrice} type="put" />
      )}
    </div>
  );
}
