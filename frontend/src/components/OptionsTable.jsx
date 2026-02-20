const riskColor = {
  low: 'text-emerald-400',
  medium: 'text-yellow-400',
  high: 'text-red-400'
};

const show = (n, digits = 2) => (Number.isFinite(n) ? Number(n).toFixed(digits) : 'N/A');

function Table({ title, options, minDelta, maxDelta }) {
  const filtered = options.filter((o) => {
    const d = Math.abs(o.delta ?? 0);
    return d >= minDelta && d <= maxDelta;
  });

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="overflow-auto max-h-[350px] border border-slate-800 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-slate-900 sticky top-0">
            <tr>
              {['Strike', 'Bid', 'Ask', 'IV', 'Delta', 'Gamma', 'Theta', 'Vega', 'Rho', 'Prob ITM', 'Score', 'Risk'].map((h) => (
                <th key={h} className="p-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.contractSymbol} className="border-t border-slate-800">
                <td className="p-2">{show(o.strike)}</td>
                <td className="p-2">{show(o.bid)}</td>
                <td className="p-2">{show(o.ask)}</td>
                <td className="p-2">{show(o.impliedVolatility, 3)}</td>
                <td className="p-2">{show(o.delta, 3)}</td>
                <td className="p-2">{show(o.gamma, 3)}</td>
                <td className="p-2">{show(o.theta, 3)}</td>
                <td className="p-2">{show(o.vega, 3)}</td>
                <td className="p-2">{show(o.rho, 3)}</td>
                <td className="p-2">{show(o.probabilityITM, 3)}</td>
                <td className="p-2">{o.score}</td>
                <td className={`p-2 font-semibold ${riskColor[o.riskLevel]}`}>{o.riskLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function OptionsTable({ data, deltaRange, setDeltaRange, expiration, setExpiration }) {
  if (!data) return <div className="text-slate-300">No options data yet.</div>;

  const [minDelta, maxDelta] = deltaRange;

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-slate-400 text-xs">Expiration</label>
          <select
            value={expiration || data.selectedExpiration}
            onChange={(e) => setExpiration(e.target.value)}
            className="block bg-slate-800 rounded px-3 py-2 mt-1"
          >
            {data.expirations.map((exp) => (
              <option key={exp} value={exp}>{new Date(exp * 1000).toLocaleDateString()}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-slate-400 text-xs">Delta Min</label>
          <input type="number" min="0" max="1" step="0.01" value={minDelta} onChange={(e) => setDeltaRange([Number(e.target.value), maxDelta])} className="block bg-slate-800 rounded px-3 py-2 mt-1 w-24" />
        </div>
        <div>
          <label className="text-slate-400 text-xs">Delta Max</label>
          <input type="number" min="0" max="1" step="0.01" value={maxDelta} onChange={(e) => setDeltaRange([minDelta, Number(e.target.value)])} className="block bg-slate-800 rounded px-3 py-2 mt-1 w-24" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Table title="Calls" options={data.calls} minDelta={minDelta} maxDelta={maxDelta} />
        <Table title="Puts" options={data.puts} minDelta={minDelta} maxDelta={maxDelta} />
      </div>
    </div>
  );
}
