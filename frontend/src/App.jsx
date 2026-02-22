import { useState } from 'react';
import { fetchOptions, fetchStock } from './api/client';
import FundamentalsPanel from './components/FundamentalsPanel';
import OptionsTable from './components/OptionsTable';
import Highlights from './components/Highlights';
import AskAI from './components/AskAI';
import BuyGuidance from './components/BuyGuidance';
import PremiumChecker from './components/PremiumChecker';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'options', label: 'Options Chain' },
  { id: 'ai', label: 'AI Advisor' }
];

export default function App() {
  const [ticker, setTicker] = useState('');
  const [fundamentals, setFundamentals] = useState(null);
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deltaRange, setDeltaRange] = useState([0.15, 0.3]);
  const [expiration, setExpiration] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const load = async (symbol = ticker, exp = '') => {
    if (!symbol.trim()) return;
    setLoading(true);
    setError('');
    try {
      const [stockData, optionsData] = await Promise.all([
        fetchStock(symbol),
        fetchOptions(symbol, exp)
      ]);
      setFundamentals(stockData);
      setOptions(optionsData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await load(ticker, expiration);
  };

  const isLive = fundamentals?.source?.yahooFinance === 'success' ||
    fundamentals?.source?.yahooFinance === 'fulfilled';
  const hasData = fundamentals || options;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">
                <span className="text-blue-400">Trade</span>Research Pro
              </h1>
              {hasData && (
                <div className="hidden sm:flex items-center gap-2">
                  {isLive ? (
                    <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">LIVE</span>
                  ) : (
                    <span className="text-[10px] font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-2 py-0.5">SAMPLE</span>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={onSubmit} className="flex items-center gap-2 flex-1 max-w-lg">
              <div className="relative flex-1">
                <input
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="Enter ticker..."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition placeholder:text-slate-500"
                />
              </div>
              <button
                className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg px-5 py-2 text-sm font-semibold transition whitespace-nowrap disabled:opacity-50"
                type="submit"
                disabled={loading || !ticker.trim()}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Loading
                  </span>
                ) : 'Research'}
              </button>
            </form>
          </div>

          {error && (
            <div className="mt-2 bg-red-900/30 border border-red-800/50 rounded-lg px-3 py-2 text-red-300 text-xs">
              {error}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="text-6xl mb-6 opacity-20">&#x1F4C8;</div>
            <h2 className="text-2xl font-bold mb-2 text-slate-300">Start Your Research</h2>
            <p className="text-slate-500 mb-6 max-w-md">Enter a ticker symbol above to view fundamentals, options chains, and get AI-powered trade analysis.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['AAPL', 'TSLA', 'NVDA', 'SPY', 'MSFT'].map((t) => (
                <button
                  key={t}
                  onClick={() => { setTicker(t); load(t); }}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-4 py-2 text-sm transition"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Price Hero */}
            {fundamentals && (
              <div className="mb-4">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-bold">{fundamentals.ticker}</span>
                  {fundamentals.displayName && (
                    <span className="text-sm text-slate-400">{fundamentals.displayName}</span>
                  )}
                </div>
                <div className="flex items-baseline gap-3 flex-wrap mt-1">
                  <span className="text-3xl font-bold">${fundamentals.currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  {fundamentals.dayChange !== undefined && fundamentals.dayChange !== 0 && (
                    <span className={`text-sm font-semibold ${fundamentals.dayChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {fundamentals.dayChange >= 0 ? '+' : ''}{Number(fundamentals.dayChange).toFixed(2)} ({fundamentals.dayChangePercent >= 0 ? '+' : ''}{Number(fundamentals.dayChangePercent).toFixed(2)}%)
                    </span>
                  )}
                  {fundamentals.week52High > 0 && (
                    <span className="text-xs text-slate-500">
                      52W: ${fundamentals.week52Low} — ${fundamentals.week52High}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-1 mb-4 border-b border-slate-800">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-blue-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <FundamentalsPanel data={fundamentals} />
                <BuyGuidance fundamentals={fundamentals} options={options} />
                <Highlights data={options?.highlightedTrades} underlyingPrice={options?.underlyingPrice} />
              </div>
            )}

            {activeTab === 'options' && (
              <div className="space-y-6">
                <PremiumChecker
                  options={options}
                  expiration={expiration}
                  onExpirationChange={async (exp) => {
                    setExpiration(exp);
                    await load(ticker, exp);
                  }}
                />
                <OptionsTable
                  data={options}
                  deltaRange={deltaRange}
                  setDeltaRange={setDeltaRange}
                  expiration={expiration}
                  setExpiration={async (exp) => {
                    setExpiration(exp);
                    await load(ticker, exp);
                  }}
                />
              </div>
            )}

            {activeTab === 'ai' && (
              <AskAI ticker={ticker} fundamentals={fundamentals} options={options} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
