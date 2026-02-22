import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { fetchAnalysis } from '../api/client';

const SUGGESTIONS = [
  { label: 'Sell puts?', full: 'Is this a good time to sell puts on this stock? What strike and expiry would you recommend?' },
  { label: 'Buy calls?', full: 'Should I buy calls on this stock? What\'s the risk/reward?' },
  { label: 'Covered calls', full: 'What\'s the risk/reward on selling covered calls at the current price?' },
  { label: 'Valuation', full: 'Based on the fundamentals, is this stock overvalued or undervalued right now?' },
  { label: 'Best strategy', full: 'Which options strategy would work best given the current IV and market conditions?' },
  { label: 'Risk analysis', full: 'What are the biggest risks to holding this stock or its options right now?' }
];

export default function AskAI({ ticker, fundamentals, options }) {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ask = async (q) => {
    const text = q || question;
    if (!text.trim() || !ticker) return;

    setLoading(true);
    setError('');
    try {
      const data = await fetchAnalysis({ question: text, ticker, fundamentals, options });
      setHistory((prev) => [...prev, { question: text, answer: data.answer, ts: Date.now() }]);
      setQuestion('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    ask();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">AI Trade Advisor</h2>
        <span className="text-[10px] text-slate-500">Powered by Llama 3.3 via Groq</span>
      </div>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => { setQuestion(s.full); ask(s.full); }}
            disabled={loading}
            className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-full px-3.5 py-1.5 text-slate-300 transition disabled:opacity-40"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`Ask about ${ticker || '...'} — puts, calls, strategy, valuation...`}
          className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition placeholder:text-slate-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg px-5 py-2.5 text-sm font-semibold transition"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Thinking
            </span>
          ) : 'Ask'}
        </button>
      </form>

      {error && (
        <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Conversation History */}
      {history.length > 0 && (
        <div className="space-y-3">
          {[...history].reverse().map((item, i) => (
            <div key={item.ts} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 border-b border-slate-800">
                {item.question}
              </div>
              <div className="px-4 py-3 text-sm leading-relaxed prose prose-invert prose-sm max-w-none
                prose-headings:text-slate-200 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                prose-p:text-slate-300 prose-p:my-1.5
                prose-strong:text-slate-200
                prose-li:text-slate-300 prose-li:my-0.5
                prose-ul:my-1.5 prose-ol:my-1.5
                prose-code:text-blue-300 prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded
              ">
                <ReactMarkdown>{item.answer}</ReactMarkdown>
              </div>
              {i === 0 && history.length > 1 && (
                <div className="border-t border-slate-800 px-4 py-1.5">
                  <span className="text-[10px] text-slate-600">Latest response</span>
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => setHistory([])}
            className="text-xs text-slate-500 hover:text-slate-400 transition"
          >
            Clear history
          </button>
        </div>
      )}
    </div>
  );
}
