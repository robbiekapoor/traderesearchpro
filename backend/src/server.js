import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { fetchFundamentals, fetchOptionsChain } from './services/marketDataService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'TradeResearch Pro API' });
});

app.get('/api/stock/:ticker', async (req, res) => {
  try {
    const data = await fetchFundamentals(req.params.ticker);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/options/:ticker', async (req, res) => {
  try {
    const data = await fetchOptionsChain(req.params.ticker, req.query.expiration);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/analyze', async (req, res) => {
  const { question, ticker, fundamentals, options } = req.body;

  if (!question || !ticker) {
    return res.status(400).json({ message: 'Question and ticker are required.' });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ message: 'GROQ_API_KEY is not configured. Add it to your .env file.' });
  }

  const marketContext = [];
  if (fundamentals) {
    marketContext.push(
      `Stock: ${ticker}`,
      `Current Price: $${fundamentals.currentPrice}`,
      `P/E Ratio: ${fundamentals.peRatio}`,
      `EPS: $${fundamentals.eps}`,
      `Market Cap: $${(fundamentals.marketCap / 1e9).toFixed(1)}B`,
      `52-Week High: $${fundamentals.week52High}`,
      `52-Week Low: $${fundamentals.week52Low}`,
      `Dividend: $${fundamentals.dividend}`
    );
  }
  if (options) {
    marketContext.push(
      `\nOptions Data:`,
      `Underlying Price: $${options.underlyingPrice}`,
      `Available Expirations: ${options.expirations?.length || 0}`,
      `Calls Available: ${options.calls?.length || 0}`,
      `Puts Available: ${options.puts?.length || 0}`
    );
    if (options.highlightedTrades?.otmPutsHighPremium?.length) {
      const top = options.highlightedTrades.otmPutsHighPremium[0];
      marketContext.push(`Top OTM Put (high premium): Strike $${top.strike}, Bid $${top.bid}, IV ${(top.impliedVolatility * 100).toFixed(1)}%, Delta ${top.delta?.toFixed(3)}`);
    }
    if (options.highlightedTrades?.otmCallsIvCrush?.length) {
      const top = options.highlightedTrades.otmCallsIvCrush[0];
      marketContext.push(`Top OTM Call (IV crush): Strike $${top.strike}, Bid $${top.bid}, IV ${(top.impliedVolatility * 100).toFixed(1)}%, Delta ${top.delta?.toFixed(3)}`);
    }
  }

  const systemPrompt = `You are a professional options and equities trading analyst. The user is researching ${ticker} and has access to the market data below. Provide clear, actionable analysis based on the data. Be specific about risk/reward. Always include a disclaimer that this is not financial advice.

Current Market Data:
${marketContext.join('\n')}`;

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }, {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const answer = response.data?.choices?.[0]?.message?.content || 'No response.';
    res.json({ answer });
  } catch (error) {
    const errData = error.response?.data;
    const msg = errData?.error?.message || errData?.message || error.message;
    console.error(`[Groq] Error (${error.response?.status}):`, JSON.stringify(errData || msg));
    res.status(500).json({ message: `Groq API error: ${msg}` });
  }
});

app.listen(PORT, () => {
  console.log(`TradeResearch Pro backend listening on http://localhost:${PORT}`);
});
