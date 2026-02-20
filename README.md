# Options + Stock Research Tracker

A Streamlit app for researching:
- **Options sensitivity** using Black-Scholes Greeks (Delta, Gamma, Theta, Vega, Rho)
- **Stock fundamentals** such as EPS, P/E, revenue, net profit, dividends, ROE, and debt/equity
- **Idea tracking** with a local watchlist editor

## Features

1. **Dashboard**
   - Quick snapshot of your watchlist and status breakdown.

2. **Options Greeks Calculator**
   - Enter spot, strike, DTE, risk-free rate, volatility, and option type.
   - Get real-time Greek estimates.

3. **Fundamental Research**
   - Pulls data from Yahoo Finance (`yfinance`) for a ticker.
   - Computes a simple investment quality score out of 100.
   - Displays 1-year price chart.

4. **Watchlist Tracker**
   - Add/update research ideas with thesis, target, stop, and status.
   - Saves entries to `data/watchlist.csv`.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

Then open the URL shown in terminal (usually `http://localhost:8501`).

## Notes

- Greeks are model outputs under Black-Scholes assumptions and should be used as guidance, not certainty.
- Fundamental scoring is intentionally simple and should be customized for your style.
