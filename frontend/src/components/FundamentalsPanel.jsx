const fmtPrice = (n) => {
  if (!n && n !== 0) return '—';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtBig = (num) => {
  if (!num) return '—';
  const n = Number(num);
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
};

const fmtVol = (n) => {
  if (!n) return '—';
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
};

function fmtYield(raw) {
  if (!raw) return '—';
  const v = Number(raw);
  if (v <= 0) return '—';
  return `${v.toFixed(2)}%`;
}

function Cell({ label, value, positive }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-slate-800/60 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${
        positive === true ? 'text-emerald-400' :
        positive === false ? 'text-red-400' :
        'text-slate-100'
      }`}>
        {value}
      </span>
    </div>
  );
}

export default function FundamentalsPanel({ data }) {
  if (!data) return null;

  const pe = Number(data.peRatio) || 0;
  const eps = Number(data.eps) || 0;
  const beta = Number(data.beta) || 0;
  const div = Number(data.dividend) || 0;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Key Metrics</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-4 gap-x-6 gap-y-0">
          <div>
            <Cell label="Open" value={fmtPrice(data.open)} />
            <Cell label="High" value={fmtPrice(data.dayHigh)} />
            <Cell label="Low" value={fmtPrice(data.dayLow)} />
          </div>
          <div>
            <Cell label="Volume" value={fmtVol(data.volume)} />
            <Cell label="P/E" value={pe ? pe.toFixed(2) : '—'} />
            <Cell label="Mkt Cap" value={fmtBig(data.marketCap)} />
          </div>
          <div>
            <Cell label="52W High" value={fmtPrice(data.week52High)} />
            <Cell label="52W Low" value={fmtPrice(data.week52Low)} />
            <Cell label="Yield" value={fmtYield(data.dividendYield)} />
          </div>
          <div>
            <Cell label="Beta" value={beta ? beta.toFixed(2) : '—'} />
            <Cell label="EPS" value={eps ? `$${eps.toFixed(2)}` : '—'} positive={eps > 0 ? true : eps < 0 ? false : undefined} />
            <Cell label="Dividend" value={div ? `$${div.toFixed(2)}` : '—'} />
          </div>
        </div>
      </div>
    </div>
  );
}
