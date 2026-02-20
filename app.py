from pathlib import Path
from datetime import date
import math

import numpy as np
import pandas as pd
import plotly.express as px
import streamlit as st
import yfinance as yf
from scipy.stats import norm

DATA_FILE = Path("data/watchlist.csv")


def init_watchlist() -> pd.DataFrame:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    if DATA_FILE.exists():
        return pd.read_csv(DATA_FILE)

    starter = pd.DataFrame(
        [
            {
                "Ticker": "AAPL",
                "Thesis": "AI ecosystem and services growth",
                "EntryPrice": 0.0,
                "TargetPrice": 0.0,
                "StopLoss": 0.0,
                "Status": "Researching",
                "Updated": str(date.today()),
            },
            {
                "Ticker": "MSFT",
                "Thesis": "Cloud + enterprise AI tailwinds",
                "EntryPrice": 0.0,
                "TargetPrice": 0.0,
                "StopLoss": 0.0,
                "Status": "Watch",
                "Updated": str(date.today()),
            },
        ]
    )
    starter.to_csv(DATA_FILE, index=False)
    return starter


def save_watchlist(df: pd.DataFrame) -> None:
    df.to_csv(DATA_FILE, index=False)


def black_scholes_greeks(
    spot: float,
    strike: float,
    days_to_expiry: int,
    rate: float,
    volatility: float,
    option_type: str,
) -> dict[str, float]:
    t = max(days_to_expiry / 365.0, 1e-6)
    sigma = max(volatility, 1e-6)

    d1 = (math.log(spot / strike) + (rate + 0.5 * sigma**2) * t) / (sigma * math.sqrt(t))
    d2 = d1 - sigma * math.sqrt(t)

    pdf = norm.pdf(d1)
    if option_type == "Call":
        delta = norm.cdf(d1)
        theta = (
            -(spot * pdf * sigma) / (2 * math.sqrt(t))
            - rate * strike * math.exp(-rate * t) * norm.cdf(d2)
        ) / 365
        rho = (strike * t * math.exp(-rate * t) * norm.cdf(d2)) / 100
    else:
        delta = norm.cdf(d1) - 1
        theta = (
            -(spot * pdf * sigma) / (2 * math.sqrt(t))
            + rate * strike * math.exp(-rate * t) * norm.cdf(-d2)
        ) / 365
        rho = (-strike * t * math.exp(-rate * t) * norm.cdf(-d2)) / 100

    gamma = pdf / (spot * sigma * math.sqrt(t))
    vega = spot * pdf * math.sqrt(t) / 100

    return {
        "Delta": round(delta, 4),
        "Gamma": round(gamma, 4),
        "Theta (daily)": round(theta, 4),
        "Vega": round(vega, 4),
        "Rho": round(rho, 4),
    }


def get_stock_snapshot(ticker: str) -> dict:
    t = yf.Ticker(ticker)
    info = t.info
    hist = t.history(period="1y")

    snapshot = {
        "Ticker": ticker.upper(),
        "Price": info.get("currentPrice") or info.get("regularMarketPrice"),
        "P/E": info.get("trailingPE"),
        "EPS": info.get("trailingEps"),
        "Revenue": info.get("totalRevenue"),
        "Net Profit": info.get("netIncomeToCommon"),
        "Dividend Yield": info.get("dividendYield"),
        "Market Cap": info.get("marketCap"),
        "ROE": info.get("returnOnEquity"),
        "Debt/Equity": info.get("debtToEquity"),
        "Price History": hist,
    }
    return snapshot


def score_stock(snapshot: dict) -> float:
    score = 0.0

    pe = snapshot.get("P/E")
    eps = snapshot.get("EPS")
    revenue = snapshot.get("Revenue")
    profit = snapshot.get("Net Profit")
    dividend = snapshot.get("Dividend Yield")
    roe = snapshot.get("ROE")

    if pe and 0 < pe <= 25:
        score += 20
    elif pe and pe <= 35:
        score += 10

    if eps and eps > 0:
        score += 20
    if revenue and revenue > 0:
        score += 15
    if profit and profit > 0:
        score += 20
    if dividend and dividend > 0.01:
        score += 10
    if roe and roe > 0.12:
        score += 15

    return min(score, 100)


def metric_card(label: str, value) -> None:
    st.metric(label, value if value is not None else "N/A")


st.set_page_config(page_title="Options + Stock Research App", layout="wide")
st.title("📈 Options & Stock Research Tracker")
st.caption("Research options Greeks and stock fundamentals, then track your watchlist ideas.")

watchlist_df = init_watchlist()

tab_dashboard, tab_options, tab_fundamentals, tab_watchlist = st.tabs(
    ["Dashboard", "Options Greeks", "Fundamental Research", "Watchlist Tracker"]
)

with tab_dashboard:
    st.subheader("Quick Overview")
    c1, c2, c3 = st.columns(3)
    with c1:
        st.metric("Watchlist Ideas", len(watchlist_df))
    with c2:
        st.metric("Active Positions", int((watchlist_df["Status"] == "Holding").sum()))
    with c3:
        st.metric("Under Research", int((watchlist_df["Status"] == "Researching").sum()))

    if not watchlist_df.empty:
        status_counts = watchlist_df["Status"].value_counts().reset_index()
        status_counts.columns = ["Status", "Count"]
        fig = px.pie(status_counts, names="Status", values="Count", title="Watchlist Status Mix")
        st.plotly_chart(fig, use_container_width=True)

with tab_options:
    st.subheader("Options Greeks Calculator")
    st.write("Use Black-Scholes assumptions for a first-pass sensitivity analysis.")

    col1, col2, col3 = st.columns(3)
    with col1:
        spot = st.number_input("Spot Price", min_value=0.01, value=100.0)
        strike = st.number_input("Strike Price", min_value=0.01, value=100.0)
    with col2:
        days = st.number_input("Days to Expiry", min_value=1, value=30)
        rate = st.number_input("Risk-Free Rate (decimal)", min_value=0.0, max_value=1.0, value=0.05)
    with col3:
        volatility = st.number_input("Implied Volatility (decimal)", min_value=0.01, max_value=5.0, value=0.25)
        opt_type = st.selectbox("Option Type", ["Call", "Put"])

    greeks = black_scholes_greeks(spot, strike, int(days), rate, volatility, opt_type)
    cols = st.columns(5)
    for i, (k, v) in enumerate(greeks.items()):
        with cols[i]:
            st.metric(k, v)

with tab_fundamentals:
    st.subheader("Stock Fundamental Analyzer")
    ticker = st.text_input("Enter ticker", value="AAPL").upper().strip()

    if ticker:
        if st.button("Analyze Stock"):
            snapshot = get_stock_snapshot(ticker)
            quality_score = score_stock(snapshot)

            st.success(f"Investment Quality Score: {quality_score:.1f}/100")

            m1, m2, m3, m4 = st.columns(4)
            with m1:
                metric_card("Price", snapshot.get("Price"))
                metric_card("P/E", snapshot.get("P/E"))
            with m2:
                metric_card("EPS", snapshot.get("EPS"))
                metric_card("Revenue", snapshot.get("Revenue"))
            with m3:
                metric_card("Net Profit", snapshot.get("Net Profit"))
                metric_card("Dividend Yield", snapshot.get("Dividend Yield"))
            with m4:
                metric_card("ROE", snapshot.get("ROE"))
                metric_card("Debt/Equity", snapshot.get("Debt/Equity"))

            price_df = snapshot.get("Price History")
            if isinstance(price_df, pd.DataFrame) and not price_df.empty:
                price_df = price_df.reset_index()
                fig = px.line(price_df, x="Date", y="Close", title=f"{ticker} - 1Y Price Trend")
                st.plotly_chart(fig, use_container_width=True)

with tab_watchlist:
    st.subheader("Track Your Ideas")
    edited_df = st.data_editor(
        watchlist_df,
        num_rows="dynamic",
        use_container_width=True,
        column_config={
            "Status": st.column_config.SelectboxColumn(
                options=["Researching", "Watch", "Holding", "Exited"]
            )
        },
    )

    if st.button("Save Watchlist"):
        edited_df["Updated"] = str(date.today())
        save_watchlist(edited_df)
        st.success("Watchlist saved.")
