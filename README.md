# TradeResearch Pro

Full-stack stock and options research app.

## Stack
- Frontend: React + TailwindCSS + Vite
- Backend: Node.js + Express
- Data providers: Yahoo Finance + Alpha Vantage (example integrated)

## Features
- Ticker search (AAPL/MSFT/TSLA/etc.)
- Fundamentals:
  - Current price
  - EPS
  - Dividend
  - Revenue
  - Profit / Net Income
  - Market Cap
  - P/E ratio
  - 52-week high/low
- Options chain:
  - Expiration selector
  - Calls and puts with bid/ask, IV
  - Greeks: Delta, Gamma, Theta, Vega, Rho
  - Probability ITM
- Trade ideas:
  - OTM puts with high premium
  - OTM calls with IV crush potential
  - Delta filtering
- Scoring model based on premium/day, volatility, risk, liquidity
- Risk labels (green/yellow/red)

## Run locally
```bash
npm install
npm start
```

- Frontend runs on `http://localhost:5173`
- Backend runs on `http://localhost:4000`

## Environment variables
Create `backend/.env` (optional):

```bash
ALPHA_VANTAGE_API_KEY=your_key_here
PORT=4000
```

If not provided, Alpha Vantage uses `demo` key fallback.

## API endpoints
- `GET /api/health`
- `GET /api/stock/:ticker`
- `GET /api/options/:ticker?expiration=<unix_ts>`

