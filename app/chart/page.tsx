"use client";

import {
  Bell,
  CalendarDays,
} from "lucide-react";

import GoldCandlestickChart from "../components/GoldCandlestickChart";

export default function ChartPage() {
  return (
    <div id="overview">
      <header className="topbar">
        <div>
          <div className="breadcrumb">Workspace / AI Analysis</div>
          <h1>AI Analysis & Chart Execution</h1>
        </div>

        <div className="topbar-actions">
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
            Oct 15, 2026
          </div>
        </div>
      </header>
      <section className="w-full min-w-0 max-w-full">
        <GoldCandlestickChart />
      </section>
    </div>
  );
}
