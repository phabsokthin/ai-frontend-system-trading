"use client";

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Newspaper,
  ShieldAlert,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";

type Trade = {
  id: string;
  side: "BUY" | "SELL";
  entry: string;
  exit: string;
  pnl: string;
  status: "OPEN" | "CLOSED";
};

type NewsEvent = {
  time: string;
  currency: string;
  impact: "HIGH" | "MEDIUM";
  title: string;
  forecast: string;
};

const recentTrades: Trade[] = [
  {
    id: "TRD-8821",
    side: "BUY",
    entry: "4142.68",
    exit: "4163.53",
    pnl: "+$1,250.00",
    status: "CLOSED",
  },
  {
    id: "TRD-8820",
    side: "BUY",
    entry: "4132.50",
    exit: "4141.20",
    pnl: "+$870.00",
    status: "CLOSED",
  },
  {
    id: "TRD-8819",
    side: "SELL",
    entry: "4158.30",
    exit: "4152.10",
    pnl: "+$620.00",
    status: "CLOSED",
  },
  {
    id: "TRD-8818",
    side: "BUY",
    entry: "4125.10",
    exit: "4121.80",
    pnl: "-$254.80",
    status: "CLOSED",
  },
];

const upcomingNews: NewsEvent[] = [
  {
    time: "19:30",
    currency: "USD",
    impact: "HIGH",
    title: "Consumer Price Index (CPI)",
    forecast: "3.1% YoY",
  },
  {
    time: "21:00",
    currency: "USD",
    impact: "HIGH",
    title: "Federal Reserve Speech",
    forecast: "Live Remarks",
  },
  {
    time: "22:30",
    currency: "USD",
    impact: "MEDIUM",
    title: "Crude Oil Inventories",
    forecast: "-1.2M",
  },
];

export default function Dashboard() {
  return (
    <div id="overview" className="space-y-6">
      {/* 1. TOPBAR */}
      <header className="topbar">
        <div>
          <div className="breadcrumb">Workspace / Dashboard</div>
          <h1>Trading Dashboard</h1>
        </div>

        <div className="topbar-actions">
          <Link
            href="/chart"
            className="flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer"
          >
            <Activity size={15} />
            <span>Open AI Chart & Analysis</span>
            <ArrowUpRight size={15} />
          </Link>

          <div className="market-status">
            <span className="online-dot" />
            Market Monitor
          </div>

          <button className="icon-button" aria-label="Notifications">
            <Bell size={18} />
            <span className="notification-dot" />
          </button>

          <div className="date-display">
            <CalendarDays size={16} />
            Oct 15, 2026
          </div>
        </div>
      </header>

      {/* 2. STATS KPI GRID */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span>Total Balance</span>
            <div className="stat-icon">
              <Wallet size={18} />
            </div>
          </div>
          <div className="stat-value font-mono">$124,580.00</div>
          <div className="stat-change text-emerald-400 font-semibold">
            <span>+3.8% this week</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Today's Net PnL</span>
            <div className="stat-icon text-emerald-400 bg-emerald-950/40">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value font-mono text-emerald-400">+$2,485.20</div>
          <div className="stat-change text-emerald-400 font-semibold">
            <span>+12.40 pts Gold</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>AI Confluence Win Rate</span>
            <div className="stat-icon text-sky-400 bg-sky-950/40">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="stat-value font-mono">78.6%</div>
          <div className="stat-change text-[#8da2bf]">
            <span>14 of 18 trades closed in profit</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Active Position</span>
            <div className="stat-icon text-amber-400 bg-amber-950/40">
              <Zap size={18} />
            </div>
          </div>
          <div className="stat-value font-mono text-amber-400">BUY 4142.68</div>
          <div className="stat-change text-[#8da2bf]">
            <span>Target TP: 4163.53</span>
          </div>
        </div>
      </div>

      {/* 3. CONTENT GRID: MARKET OVERVIEW & SIGNAL CONFLUENCE */}
      <div className="content-grid">
        {/* Left Panel: Gold Spot XAU/USD Overview Banner */}
        <div className="panel flex flex-col justify-between">
          <div>
            <div className="section-title">
              <div className="section-heading">
                <BarChart3 size={18} />
                <h2>Gold Spot (XAU/USD) Live Status</h2>
              </div>
              <Link
                href="/chart"
                className="section-action flex items-center gap-1 hover:underline text-[#65b7ff]"
              >
                <span>Full Chart</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>

            <div className="price-summary">
              <div>
                <span className="eyebrow">SPOT COMMODITY</span>
                <div className="large-price font-mono text-white">$4,144.90</div>
              </div>
              <div className="price-badge bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                +18.40 (+0.44%)
              </div>
            </div>

            <p className="mt-4 text-xs text-[#8da2bf] leading-relaxed">
              Higher timeframe (1H) trend remains strongly bullish. The 5-minute execution chart shows EMA 9 &gt; EMA 21 golden alignment with RSI holding above 50, supporting upside continuation.
            </p>
          </div>

          <div className="mt-6 p-4 rounded-xl border border-[#2a2e39] bg-[#1e222d] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#2962ff]/10 border border-[#2962ff]/30 flex items-center justify-center text-[#2962ff]">
                <Activity size={20} />
              </div>
              <div>
                <strong className="block text-sm text-white">Interactive Candlestick & RSI</strong>
                <p className="text-xs text-[#787b86] mt-0.5">
                  Execute manual & AI-assisted trades directly into MetaTrader 5
                </p>
              </div>
            </div>

            <Link
              href="/chart"
              className="px-4 py-2 rounded-lg bg-[#2962ff] hover:bg-[#1e4bd8] text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Go to AI Analysis Chart</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {/* Right Panel: Confirmed AI Trade Setup Card */}
        <div className="panel">
          <div className="section-title">
            <div className="section-heading">
              <Zap size={18} className="text-amber-400" />
              <h2>Confirmed AI Signal Setup</h2>
            </div>
            <span className="status-pill bg-emerald-950 border border-emerald-500/40 text-emerald-400">
              ACTIVE
            </span>
          </div>

          <div className="signal-banner bg-emerald-950/30 border border-emerald-500/30">
            <div className="signal-symbol bg-emerald-900/50 text-emerald-300">
              <TrendingUp size={20} />
            </div>
            <div>
              <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                CONFLUENCE LONG
              </span>
              <h3 className="text-white font-bold">BUY Gold Spot (XAU/USD)</h3>
              <p className="text-xs text-[#9aa9bd]">Triggered at 5-minute candle close</p>
            </div>
          </div>

          <div className="signal-price">
            <div>
              <span>ENTRY LEVEL</span>
              <strong className="font-mono text-white text-base">4,142.68</strong>
            </div>
            <div>
              <span>STOP LOSS (SL)</span>
              <strong className="font-mono text-red-400 text-base">4,132.25</strong>
            </div>
          </div>

          <div className="risk-levels space-y-2 mt-3">
            <div className="risk-row">
              <span>
                <Trophy size={14} className="text-emerald-400" />
                <span>Take Profit 1</span>
              </span>
              <strong className="font-mono text-emerald-400">4,170.79</strong>
            </div>
            <div className="risk-row">
              <span>
                <Trophy size={14} className="text-emerald-300" />
                <span>Take Profit 2</span>
              </span>
              <strong className="font-mono text-emerald-300">4,163.53</strong>
            </div>
            <div className="risk-row">
              <span>
                <Trophy size={14} className="text-emerald-200" />
                <span>Take Profit 3</span>
              </span>
              <strong className="font-mono text-emerald-200">4,190.30</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM GRID: RECENT TRADES & ECONOMIC CALENDAR */}
      <div className="bottom-grid">
        {/* Recent Trades Table */}
        <div className="panel">
          <div className="section-title">
            <div className="section-heading">
              <Wallet size={18} />
              <h2>Recent MT5 Closed Trades</h2>
            </div>
            <Link href="/chart#trades" className="section-action hover:underline text-[#65b7ff]">
              View All
            </Link>
          </div>

          <div className="table-wrap">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#2a2e39] text-[#7586a0]">
                  <th className="py-2.5 px-3">Ticket</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Entry</th>
                  <th className="py-2.5 px-3">Exit</th>
                  <th className="py-2.5 px-3 text-right">Profit / Loss</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2e39]">
                {recentTrades.map((t) => (
                  <tr key={t.id} className="hover:bg-[#1e222d]/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-white">{t.id}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          t.side === "BUY"
                            ? "bg-emerald-950/70 border border-emerald-500/30 text-emerald-400"
                            : "bg-red-950/70 border border-red-500/30 text-red-400"
                        }`}
                      >
                        {t.side}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#d1d4dc]">{t.entry}</td>
                    <td className="py-2.5 px-3 font-mono text-[#d1d4dc]">{t.exit}</td>
                    <td
                      className={`py-2.5 px-3 font-mono font-bold text-right ${
                        t.pnl.startsWith("+") ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {t.pnl}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1e222d] text-[#8da2bf]">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Economic News Calendar */}
        <div className="panel">
          <div className="section-title">
            <div className="section-heading">
              <Newspaper size={18} />
              <h2>Upcoming High-Impact News</h2>
            </div>
            <span className="eyebrow">USD IMPACT</span>
          </div>

          <div className="space-y-3">
            {upcomingNews.map((n, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-[#2a2e39] bg-[#1e222d] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-amber-500/10 text-amber-400">
                    <Clock size={16} />
                  </div>
                  <div>
                    <strong className="block text-xs text-white">{n.title}</strong>
                    <span className="text-[10px] text-[#787b86]">
                      {n.currency} · Forecast: {n.forecast}
                    </span>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <span className="font-mono text-xs font-bold text-amber-400">{n.time}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      n.impact === "HIGH"
                        ? "bg-red-950/70 text-red-400 border border-red-500/30"
                        : "bg-amber-950/70 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {n.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}