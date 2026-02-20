const fmtCurrency = (num) => (num ? `$${Number(num).toLocaleString()}` : 'N/A');

export default function FundamentalsPanel({ data }) {
  if (!data) return <div className="text-slate-300">Search a ticker to view fundamentals.</div>;

  const rows = [
    ['Current Price', fmtCurrency(data.currentPrice)],
    ['EPS', data.eps || 'N/A'],
    ['Dividend', fmtCurrency(data.dividend)],
    ['Revenue', fmtCurrency(data.revenue)],
    ['Profit / Net Income', fmtCurrency(data.netIncome)],
    ['Market Cap', fmtCurrency(data.marketCap)],
    ['P/E Ratio', data.peRatio || 'N/A'],
    ['52W High', fmtCurrency(data.week52High)],
    ['52W Low', fmtCurrency(data.week52Low)]
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <h2 className="text-xl font-semibold mb-3">{data.ticker} Fundamentals</h2>
      <div className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between border-b border-slate-800 pb-1">
            <span className="text-slate-400">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
