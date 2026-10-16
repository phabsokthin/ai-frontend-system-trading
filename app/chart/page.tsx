"use client";

import {
  Bell,
  CalendarDays,
} from "lucide-react";

import GoldCandlestickChart from "../components/GoldCandlestickChart";
import TradeSignalsAndAnalysis from "../components/TradeSignalsAndAnalysis";
import GoogleTranslate from "../components/GoogleTranslate";

export default function ChartPage() {
  return (
    <div id="overview" className="space-y-6">
      <header className="topbar">
        <div>
          <div className="breadcrumb">Workspace / AI Analysis</div>
          <h1>AI Analysis & Chart Execution</h1>
        </div>

        <div className="topbar-actions">
          {/* Language Switcher */}
          <GoogleTranslate variant="topbar" />

          <div className="market-status">
            <span className="online-dot" />
            Market Monitor
          </div>
          <button className="icon-button" aria-label="Notifications">
            <Bell size={19} />
            <span className="notification-dot" />
          </button>
          <div className="date-display">
            <CalendarDays size={17} />
            Oct 16, 2026
          </div>
        </div>
      </header>

      {/* Interactive Candlestick Chart with Overlays & MT5 Execution */}
      <section className="w-full min-w-0 max-w-full">
        <GoldCandlestickChart />
      </section>

      {/* Comprehensive Signals List, Trade History, & Multi-Timeframe Analysis */}
      <section className="w-full min-w-0 max-w-full">
        <TradeSignalsAndAnalysis />
      </section>
    </div>
  );
}

