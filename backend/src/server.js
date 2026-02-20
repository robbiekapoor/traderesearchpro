import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fetchFundamentals, fetchOptionsChain } from './services/marketDataService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

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

app.listen(PORT, () => {
  console.log(`TradeResearch Pro backend listening on http://localhost:${PORT}`);
});
