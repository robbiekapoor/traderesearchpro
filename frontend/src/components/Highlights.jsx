function TradeCard({ option, type, underlyingPrice }) {
  const iv = option.impliedVolatility ? (option.impliedVolatility * 100).toFixed(1) : '—';
  const distance = underlyingPrice
    ? ((Math.abs(option.strike - underlyingPrice) / underlyingPrice) * 100).toFixed(1)
    : null;

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 hover:border-slate-600 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">${option.strike}</span>
        <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
          option.riskLevel === 'low' ? 'bg-emerald-500/10 text-emerald-400' :
          option.riskLevel === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
          'bg-red-500/10 text-red-400'
        }`}>
          {option.riskLevel?.toUpperCase()}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">Bid/Ask</span>
          <span>${option.bid?.toFixed(2)} / ${option.ask?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">IV</span>
          <span>{iv}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Daily Decay</span>
          <span className="text-emerald-400">${option.premiumPerDay?.toFixed(3)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Delta</span>
          <span>{option.delta?.toFixed(3) ?? '—'}</span>
        </div>
        {distance && (
          <div className="flex justify-between col-span-2">
            <span className="text-slate-400">Distance OTM</span>
            <span>{distance}%</span>
          </div>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-700/50 flex justify-between items-center">
        <span className="text-[10px] text-slate-500">Score</span>
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${Math.min(option.score, 100)}%` }}
            />
          </div>
          <span className="text-xs font-semibold">{option.score}</span>
        </div>
      </div>
    </div>
  );
}

export default function Highlights({ data, underlyingPrice }) {
  if (!data) return null;

  const puts = data.otmPutsHighPremium || [];
  const calls = data.otmCallsIvCrush || [];
  if (!puts.length && !calls.length) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Trade Ideas</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {puts.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <h3 className="text-sm font-semibold">OTM Puts — High Premium</h3>
            </div>
            <p className="text-[11px] text-slate-500">Top out-of-the-money puts ranked by premium per day. Good candidates for selling puts if bullish.</p>
            <div className="space-y-2">
              {puts.map((o) => <TradeCard key={o.contractSymbol} option={o} type="put" underlyingPrice={underlyingPrice} />)}
            </div>
          </div>
        )}
        {calls.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <h3 className="text-sm font-semibold">OTM Calls — IV Crush Potential</h3>
            </div>
            <p className="text-[11px] text-slate-500">High-IV out-of-the-money calls that may benefit from volatility contraction.</p>
            <div className="space-y-2">
              {calls.map((o) => <TradeCard key={o.contractSymbol} option={o} type="call" underlyingPrice={underlyingPrice} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
