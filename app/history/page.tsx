"use client";

import {
  Bell,
  CalendarDays,
  History,
} from "lucide-react";
import TradeSignalsAndAnalysis from "../components/TradeSignalsAndAnalysis";
import GoogleTranslate from "../components/GoogleTranslate";

export default function HistoryPage() {
  return (
    <div id="overview" className="space-y-6">
      <header className="topbar">
        <div>
          <div className="breadcrumb">Workspace / History</div>
          <h1>Trade & Signal History</h1>
        </div>

        <div className="topbar-actions">
          {/* Language Switcher */}
          <GoogleTranslate variant="topbar" />

        
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

      {/* History Ledger & Signals View defaulting to trades */}
      <section className="w-full min-w-0 max-w-full">
        <TradeSignalsAndAnalysis initialTab="trades" />
      </section>
    </div>
  );
}
