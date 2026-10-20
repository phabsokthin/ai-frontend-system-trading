"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
} from "lucide-react";

import GoldCandlestickChart from "../components/GoldCandlestickChart";
import GoogleTranslate from "../components/GoogleTranslate";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_MARKET_API_URL?.replace(/\/api\/candles\/?$/, "") ??
  "http://localhost:8000";

export default function ChartPage() {
  const [marketStatus, setMarketStatus] = useState<{
    is_market_closed: boolean;
    market_status: string;
    reason: string;
    day_of_week?: string;
  } | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/api/market/status`);
        if (res.ok) {
          const data = await res.json();
          setMarketStatus(data);
        }
      } catch {
        const day = new Date().getUTCDay(); // 0 is Sunday, 6 is Saturday
        const isWknd = day === 0 || day === 6;
        setMarketStatus({
          is_market_closed: isWknd,
          market_status: isWknd ? "CLOSED" : "OPEN",
          reason: isWknd ? "Weekend market closure (Saturday & Sunday)" : "Market is open",
        });
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const [todayStr, setTodayStr] = useState<string>("");

  useEffect(() => {
    setTodayStr(
      new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    );
  }, []);

  const isClosed = marketStatus?.is_market_closed;

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

          <div
            className="market-status"
            style={
              isClosed
                ? {
                    borderColor: "rgba(245, 158, 11, 0.4)",
                    backgroundColor: "rgba(245, 158, 11, 0.12)",
                    color: "#f59e0b",
                  }
                : undefined
            }
            title={marketStatus?.reason || (isClosed ? "Market is closed on Saturday & Sunday" : "Market is active")}
          >
            <span
              className={isClosed ? "pulse-dot" : "online-dot"}
              style={
                isClosed
                  ? {
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "#f59e0b",
                      display: "inline-block",
                      marginRight: 6,
                    }
                  : undefined
              }
            />
            {isClosed ? "Market Closed (Weekend)" : "Market Monitor"}
          </div>
          <button className="icon-button" aria-label="Notifications">
            <Bell size={19} />
            <span className="notification-dot" />
          </button>
          <div className="date-display">
            <CalendarDays size={17} />
            {todayStr}
          </div>
        </div>
      </header>

      {/* Interactive Candlestick Chart with Overlays & MT5 Execution */}
      <section className="w-full min-w-0 max-w-full">
        <GoldCandlestickChart />
      </section>
    </div>
  );
}


