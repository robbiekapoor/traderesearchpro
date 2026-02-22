import { useRef } from 'react';

function Signal({ label, value, signal, detail, id }) {
  const color = signal === 'bullish' ? 'text-emerald-400' :
    signal === 'bearish' ? 'text-red-400' : 'text-yellow-400';
  const bg = signal === 'bullish' ? 'bg-emerald-500/10' :
    signal === 'bearish' ? 'bg-red-500/10' : 'bg-yellow-500/10';
  const icon = signal === 'bullish' ? '▲' : signal === 'bearish' ? '▼' : '—';

  return (
    <div id={id} className={`${bg} border border-slate-700/50 rounded-lg p-3 scroll-mt-24`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</span>
        <span className={`text-xs font-semibold ${color}`}>{icon} {signal.toUpperCase()}</span>
      </div>
      <div className="text-sm font-semibold text-slate-200">{value}</div>
      {detail && <div className="text-[11px] text-slate-500 mt-1">{detail}</div>}
    </div>
  );
}

function SignalCountLink({ count, type, onClick }) {
  if (count === 0) return null;
  const color = type === 'bullish' ? 'text-emerald-400 hover:text-emerald-300' :
    type === 'bearish' ? 'text-red-400 hover:text-red-300' :
    'text-yellow-400 hover:text-yellow-300';

  return (
    <button onClick={onClick} className={`${color} font-semibold underline underline-offset-2 decoration-dotted cursor-pointer transition`}>
      {count} {type}
    </button>
  );
}

export default function BuyGuidance({ fundamentals, options }) {
  if (!fundamentals) return null;

  const signalsRef = useRef(null);
  const price = Number(fundamentals.currentPrice) || 0;
  const w52High = Number(fundamentals.week52High) || 0;
  const w52Low = Number(fundamentals.week52Low) || 0;
  const pe = Number(fundamentals.peRatio) || 0;
  const forwardPE = Number(fundamentals.forwardPE) || 0;
  const fiftyDay = Number(fundamentals.fiftyDayAvg) || 0;
  const twoHundredDay = Number(fundamentals.twoHundredDayAvg) || 0;
  const divYieldPct = Number(fundamentals.dividendYield) || 0;
  const divYield = divYieldPct / 100;
  const isETF = fundamentals.quoteType === 'ETF';

  const signals = [];

  if (w52High > 0 && w52Low > 0) {
    const range = w52High - w52Low;
    const position = range > 0 ? ((price - w52Low) / range) * 100 : 50;
    const posLabel = `${position.toFixed(0)}% of 52W range`;
    if (position < 30) {
      signals.push({ label: '52-Week Position', value: posLabel, signal: 'bullish', detail: 'Near 52-week low — potential value entry point' });
    } else if (position > 80) {
      signals.push({ label: '52-Week Position', value: posLabel, signal: 'bearish', detail: 'Near 52-week high — may be extended' });
    } else {
      signals.push({ label: '52-Week Position', value: posLabel, signal: 'neutral', detail: 'Mid-range — neither stretched nor discounted' });
    }
  }

  if (!isETF && pe > 0) {
    if (pe < 15) {
      signals.push({ label: 'Valuation (P/E)', value: pe.toFixed(1), signal: 'bullish', detail: 'Below-average P/E — may be undervalued' });
    } else if (pe > 30) {
      signals.push({ label: 'Valuation (P/E)', value: pe.toFixed(1), signal: 'bearish', detail: 'Elevated P/E — priced for high growth' });
    } else {
      signals.push({ label: 'Valuation (P/E)', value: pe.toFixed(1), signal: 'neutral', detail: 'Reasonable P/E within market norms' });
    }
  }

  if (!isETF && forwardPE > 0 && pe > 0) {
    const growth = ((pe - forwardPE) / pe) * 100;
    if (growth > 15) {
      signals.push({ label: 'Earnings Growth', value: `Forward P/E: ${forwardPE.toFixed(1)}`, signal: 'bullish', detail: `${growth.toFixed(0)}% earnings growth expected` });
    } else if (growth < -10) {
      signals.push({ label: 'Earnings Growth', value: `Forward P/E: ${forwardPE.toFixed(1)}`, signal: 'bearish', detail: 'Earnings expected to decline' });
    }
  }

  if (fiftyDay > 0 && twoHundredDay > 0) {
    if (price > fiftyDay && fiftyDay > twoHundredDay) {
      signals.push({ label: 'Trend', value: 'Above 50 & 200 DMA', signal: 'bullish', detail: 'Price above both moving averages — strong uptrend' });
    } else if (price < fiftyDay && fiftyDay < twoHundredDay) {
      signals.push({ label: 'Trend', value: 'Below 50 & 200 DMA', signal: 'bearish', detail: 'Price below both moving averages — downtrend' });
    } else if (price > twoHundredDay) {
      signals.push({ label: 'Trend', value: 'Above 200 DMA', signal: 'neutral', detail: 'Long-term trend intact but short-term mixed' });
    } else {
      signals.push({ label: 'Trend', value: 'Below 200 DMA', signal: 'bearish', detail: 'Below long-term average — cautious' });
    }
  }

  if (divYield > 0) {
    const annualIncome = price * divYield;
    if (divYield > 0.04) {
      signals.push({ label: 'Dividend Yield', value: `${(divYield * 100).toFixed(2)}%`, signal: 'bullish', detail: `$${annualIncome.toFixed(2)}/share annual income — high yield` });
    } else if (divYield > 0.02) {
      signals.push({ label: 'Dividend Yield', value: `${(divYield * 100).toFixed(2)}%`, signal: 'neutral', detail: `$${annualIncome.toFixed(2)}/share annual income` });
    } else {
      signals.push({ label: 'Dividend Yield', value: `${(divYield * 100).toFixed(2)}%`, signal: 'neutral', detail: `$${annualIncome.toFixed(2)}/share annual income — modest yield` });
    }
  }

  if (options?.calls?.length) {
    const avgIv = options.calls.reduce((s, o) => s + (o.impliedVolatility ?? 0), 0) / options.calls.length;
    if (avgIv > 0.5) {
      signals.push({ label: 'Options IV', value: `${(avgIv * 100).toFixed(1)}% avg`, signal: 'neutral', detail: 'High IV — options are expensive. Consider selling premium.' });
    } else if (avgIv > 0.25) {
      signals.push({ label: 'Options IV', value: `${(avgIv * 100).toFixed(1)}% avg`, signal: 'neutral', detail: 'Moderate IV — balanced premium pricing' });
    } else {
      signals.push({ label: 'Options IV', value: `${(avgIv * 100).toFixed(1)}% avg`, signal: 'neutral', detail: 'Low IV — options are cheap. Consider buying premium.' });
    }
  }

  const bullishSignals = signals.filter(s => s.signal === 'bullish');
  const bearishSignals = signals.filter(s => s.signal === 'bearish');
  const neutralSignals = signals.filter(s => s.signal === 'neutral');

  const scrollToFirst = (type) => {
    const idx = signals.findIndex(s => s.signal === type);
    if (idx >= 0) {
      const el = document.getElementById(`signal-${idx}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.classList.add('ring-2', 'ring-slate-400');
      setTimeout(() => el?.classList.remove('ring-2', 'ring-slate-400'), 1500);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Buy / Sell Guidance</h2>
        <span className="text-[10px] text-slate-600">Based on market data analysis</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm">
          <SignalCountLink count={bullishSignals.length} type="bullish" onClick={() => scrollToFirst('bullish')} />
          {bullishSignals.length > 0 && bearishSignals.length + neutralSignals.length > 0 && <span className="text-slate-600">&middot;</span>}
          <SignalCountLink count={bearishSignals.length} type="bearish" onClick={() => scrollToFirst('bearish')} />
          {bearishSignals.length > 0 && neutralSignals.length > 0 && <span className="text-slate-600">&middot;</span>}
          <SignalCountLink count={neutralSignals.length} type="neutral" onClick={() => scrollToFirst('neutral')} />
          <span className="text-xs text-slate-600 ml-1">signals</span>
        </div>
      </div>

      <div ref={signalsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {signals.map((s, i) => (
          <Signal key={s.label} {...s} id={`signal-${i}`} />
        ))}
      </div>

      <p className="text-[10px] text-slate-600 italic">
        This is an automated summary based on market data, not financial advice. Always do your own research.
      </p>
    </div>
  );
}
