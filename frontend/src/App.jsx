import { useState } from 'react';
import { fetchOptions, fetchStock } from './api/client';
import FundamentalsPanel from './components/FundamentalsPanel';
import OptionsTable from './components/OptionsTable';
import Highlights from './components/Highlights';

export default function App() {
  const [ticker, setTicker] = useState('AAPL');
  const [fundamentals, setFundamentals] = useState(null);
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deltaRange, setDeltaRange] = useState([0.15, 0.3]);
  const [expiration, setExpiration] = useState('');

  const load = async (symbol = ticker, exp = '') => {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold">TradeResearch Pro</h1>

        <form onSubmit={onSubmit} className="flex flex-wrap gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Search ticker (AAPL, MSFT, TSLA...)"
            className="bg-slate-800 rounded px-4 py-2 w-72"
          />
          <button className="bg-blue-600 hover:bg-blue-500 rounded px-4 py-2 font-semibold" type="submit">
            {loading ? 'Loading...' : 'Research'}
          </button>
          {error && <span className="text-red-400 text-sm">{error}</span>}
        </form>

        <div className="grid lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            <FundamentalsPanel data={fundamentals} />
          </div>
          <div className="lg:col-span-8 space-y-4">
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
            <Highlights data={options?.highlightedTrades} />
          </div>
        </div>
      </div>
    </div>
  );
}
