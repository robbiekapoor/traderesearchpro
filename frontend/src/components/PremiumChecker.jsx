import { useState, useMemo } from 'react';

const show = (n, d = 2) => (Number.isFinite(n) ? Number(n).toFixed(d) : '—');

const ACTIONS = [
  { id: 'sell_to_open',  label: 'Sell to Open',  dir: 'credit' },
  { id: 'buy_to_open',   label: 'Buy to Open',   dir: 'debit'  },
  { id: 'buy_to_close',  label: 'Buy to Close',  dir: 'debit'  },
  { id: 'sell_to_close', label: 'Sell to Close', dir: 'credit' },
];

export default function PremiumChecker({ options, expiration, onExpirationChange }) {
  if (!options?.calls?.length) return null;

  const [selectedStrike, setSelectedStrike] = useState('');
  const [side, setSide] = useState('put');
  const [qty, setQty] = useState(1);
  const [action, setAction] = useState('sell_to_open');

  const strikes = useMemo(() => {
    const all = new Set();
    (options.calls || []).forEach((o) => all.add(o.strike));
    (options.puts || []).forEach((o) => all.add(o.strike));
    return [...all].sort((a, b) => a - b);
  }, [options]);

  const price = options.underlyingPrice || 0;

  const atmStrike = useMemo(() =>
    strikes.reduce((best, s) => Math.abs(s - price) < Math.abs(best - price) ? s : best, strikes[0])
  , [strikes, price]);

  const active = selectedStrike || atmStrike;

  const contract = side === 'call'
    ? (options.calls || []).find((o) => o.strike === active)
    : (options.puts || []).find((o) => o.strike === active);

  const mid = contract ? (contract.bid + contract.ask) / 2 : 0;
  const actionMeta = ACTIONS.find((a) => a.id === action);
  const isCredit = actionMeta?.dir === 'credit';
  const fillPrice = isCredit ? contract?.bid ?? mid : contract?.ask ?? mid;
  const totalCost = fillPrice * 100 * qty;

  const fmtExp = (ts) => {
    const d = new Date(ts * 1000);
    return d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Option Chain</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

        {/* Top info bar */}
        <div className="bg-slate-800/60 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-lg font-bold">${price.toFixed(2)}</span>
              {options.ticker && <span className="text-xs text-slate-400 ml-2">{options.ticker}</span>}
            </div>
          </div>
          {contract?.inTheMoney && (
            <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-full px-2 py-0.5">ITM</span>
          )}
        </div>

        {/* Chain selector row */}
        <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className={`block border rounded px-3 py-1.5 mt-1 text-sm font-medium focus:outline-none focus:border-blue-500 ${
                isCredit
                  ? 'bg-emerald-900/40 border-emerald-700/60 text-emerald-300'
                  : 'bg-red-900/40 border-red-700/60 text-red-300'
              }`}
            >
              {ACTIONS.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Expiration</label>
            <select
              value={expiration || options.selectedExpiration}
              onChange={(e) => onExpirationChange(e.target.value)}
              className="block bg-slate-800 border border-slate-700 rounded px-3 py-1.5 mt-1 text-sm focus:outline-none focus:border-blue-500"
            >
              {(options.expirations || []).map((exp) => (
                <option key={exp} value={exp}>{fmtExp(exp)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Strike</label>
            <select
              value={active}
              onChange={(e) => setSelectedStrike(Number(e.target.value))}
              className="block bg-slate-800 border border-slate-700 rounded px-3 py-1.5 mt-1 text-sm focus:outline-none focus:border-blue-500"
            >
              {strikes.map((s) => (
                <option key={s} value={s}>
                  {s.toFixed(2)}{s === atmStrike ? ' (ATM)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Type</label>
            <div className="flex mt-1 border border-slate-700 rounded overflow-hidden">
              <button
                onClick={() => setSide('call')}
                className={`px-4 py-1.5 text-sm font-medium transition ${
                  side === 'call'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Call
              </button>
              <button
                onClick={() => setSide('put')}
                className={`px-4 py-1.5 text-sm font-medium transition ${
                  side === 'put'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Put
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wide">Quantity</label>
            <div className="flex items-center mt-1 border border-slate-700 rounded overflow-hidden">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="px-2.5 py-1.5 bg-slate-800 text-slate-400 hover:text-white transition text-sm font-bold"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 text-center bg-slate-800 text-sm py-1.5 border-x border-slate-700 focus:outline-none"
              />
              <button
                onClick={() => setQty(qty + 1)}
                className="px-2.5 py-1.5 bg-slate-800 text-slate-400 hover:text-white transition text-sm font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Bid / Mid / Ask */}
        {contract ? (
          <>
            <div className="px-4 py-4">
              <div className="grid grid-cols-3 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Bid</div>
                  <div className="text-lg font-bold text-slate-100">{show(contract.bid)}</div>
                </div>
                <div className="border-x border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Mid</div>
                  <div className="text-lg font-bold text-blue-400">{show(mid)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Ask</div>
                  <div className="text-lg font-bold text-slate-100">{show(contract.ask)}</div>
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="border-t border-slate-800 px-4 py-3">
              <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-xs">
                <Detail label="IV" value={`${show(contract.impliedVolatility * 100, 1)}%`} />
                <Detail label="Delta" value={show(contract.delta, 3)} />
                <Detail label="Gamma" value={show(contract.gamma, 4)} />
                <Detail label="Theta" value={show(contract.theta, 3)} negative />
                <Detail label="Vega" value={show(contract.vega, 3)} />
                <Detail label="Open Int" value={contract.openInterest?.toLocaleString() ?? '—'} />
                <Detail label="Volume" value={contract.volume?.toLocaleString() ?? '—'} />
                <Detail label="Spread" value={`$${show(contract.ask - contract.bid)}`} />
              </div>
            </div>

            {/* Cost summary */}
            <div className="border-t border-slate-800 px-4 py-3 bg-slate-800/30">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-6 text-xs">
                  <span className="text-slate-400">Premium/Day: <span className="text-emerald-400 font-semibold">${show(contract.premiumPerDay, 3)}</span></span>
                  <span className="text-slate-400">Score: <span className="text-slate-200 font-semibold">{contract.score}</span></span>
                  <span className={`text-xs font-semibold ${
                    contract.riskLevel === 'low' ? 'text-emerald-400' :
                    contract.riskLevel === 'medium' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {contract.riskLevel?.toUpperCase()} RISK
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                    Estimated {isCredit ? 'Credit' : 'Debit'}
                  </div>
                  <div className={`text-xl font-bold ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                    ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {qty} × 100 × ${show(fillPrice)} (based on {isCredit ? 'bid' : 'ask'} price)
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No {side} contract available at ${active.toFixed(2)} strike
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value, negative }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={negative ? 'text-red-300' : 'text-slate-300'}>{value}</span>
    </div>
  );
}
