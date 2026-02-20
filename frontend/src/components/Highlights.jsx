export default function Highlights({ data }) {
  if (!data) return null;

  const block = (title, rows) => (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="space-y-1 text-xs">
        {rows.map((o) => (
          <div key={o.contractSymbol} className="flex justify-between">
            <span>{o.contractSymbol}</span>
            <span>PPD: {o.premiumPerDay?.toFixed(3)} | IV: {o.impliedVolatility?.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {block('OTM Puts - High Premium', data.otmPutsHighPremium || [])}
      {block('OTM Calls - IV Crush Potential', data.otmCallsIvCrush || [])}
    </div>
  );
}
