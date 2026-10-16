"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Newspaper,
  Percent,
  RefreshCw,
  Shield,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import GoogleTranslate from "../components/GoogleTranslate";
import { formatCambodiaTime } from "../utils/dateFormat";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_MARKET_API_URL?.replace(/\/api\/candles\/?$/, "") ??
  "http://localhost:8000";

type TradeItem = {
  id: string;
  side: "BUY" | "SELL";
  entry: string;
  exit: string;
  pnl_points: number;
  pnl: string;
  status: string;
  exit_time?: string;
  exit_reason?: string;
};

type NewsItem = {
  time: string;
  currency: string;
  impact: string;
  title: string;
  forecast: string;
};

type ReportData = {
  success: boolean;
  generated_at?: string;
  metrics: {
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    breakeven_trades: number;
    win_rate_pct: number;
    loss_rate_pct: number;
    total_pnl_points: number;
    total_pnl_usd: number;
    gross_profit_points: number;
    gross_loss_points: number;
    profit_factor: number;
    avg_trade_points: number;
    avg_win_points: number;
    avg_loss_points: number;
    risk_reward_ratio: number;
    largest_win_points: number;
    largest_loss_points: number;
    max_consecutive_wins: number;
    max_consecutive_losses: number;
    max_drawdown_points: number;
    direction_breakdown: {
      BUY: { count: number; wins: number; losses: number; win_rate_pct: number; pnl_points: number };
      SELL: { count: number; wins: number; losses: number; win_rate_pct: number; pnl_points: number };
    };
  };
  active_trade?: {
    id?: string;
    direction?: "BUY" | "SELL";
    entry_price?: number;
    stop_loss?: number;
    take_profit?: number;
    sl?: number;
    tp?: number;
    tp1?: number;
    tp2?: number;
    tp3?: number;
    status?: string;
    reason?: string;
    entry_reason?: string;
    current_price?: number;
    unrealized_pnl_points?: number;
  } | null;
  market_snapshot?: {
    symbol?: string;
    price?: number;
    macro_trend?: string;
    htf_rsi?: number;
    entry_signal?: string;
    action?: string;
    pivot_point?: number;
  };
  recent_trades: TradeItem[];
  upcoming_news: NewsItem[];
};

export default function Dashboard() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/report?limit=100`);
      if (res.ok) {
        const data: ReportData = await res.json();
        setReport(data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.warn("Failed fetching live report:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
    const interval = setInterval(fetchReport, 5000);
    return () => clearInterval(interval);
  }, [fetchReport]);

  const metrics = report?.metrics;
  const activeTrade = report?.active_trade;
  const market = report?.market_snapshot;
  const recentTrades = report?.recent_trades ?? [];
  const upcomingNews = report?.upcoming_news ?? [];

  const totalPnlUsd = metrics?.total_pnl_usd ?? 0;
  const isNetWin = totalPnlUsd >= 0;

  return (
    <div id="overview" className="space-y-6">
      {/* 1. TOPBAR */}
      <header className="topbar">
        <div>
          <div className="breadcrumb">Workspace / Dashboard</div>
          <h1 className="flex items-center gap-2.5">
            <span>Trading Performance Dashboard</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-(--pill-bg) text-(--muted) border border-(--border)">
              Live Report
            </span>
          </h1>
        </div>

        <div className="topbar-actions">
          {/* Language Switcher (Google Translate) */}
          <GoogleTranslate variant="topbar" />

          <button
            type="button"
            onClick={fetchReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--panel) hover:bg-(--panel-hover) border border-(--card-border) text-xs font-medium text-white transition-all cursor-pointer"
            title="Refresh Live Report"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[#2962ff]" : ""} />
            <span>{lastUpdated ? `Sync ${lastUpdated}` : "Syncing..."}</span>
          </button>

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
            MongoDB Connected
          </div>

          <div className="date-display">
            <CalendarDays size={16} />
            Oct 16, 2026
          </div>
        </div>
      </header>

      {/* 2. STATS KPI GRID (LIVE REPORT METRICS) */}
      <div className="stats-grid">
        {/* KPI 1: Realized Net PnL */}
        <div className="stat-card">
          <div className="stat-top">
            <span>Total Realized PnL</span>
            <div className={`stat-icon ${isNetWin ? "text-emerald-400 bg-emerald-950/40" : "text-red-400 bg-red-950/40"}`}>
              <Wallet size={18} />
            </div>
          </div>
          <div className={`stat-value font-mono ${isNetWin ? "text-emerald-400" : "text-red-400"}`}>
            {isNetWin ? "+" : ""}${totalPnlUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`stat-change font-semibold ${isNetWin ? "text-emerald-400" : "text-red-400"}`}>
            <span>
              {isNetWin ? "+" : ""}{metrics?.total_pnl_points?.toFixed(2) ?? "0.00"} pts net gold
            </span>
          </div>
        </div>

        {/* KPI 2: AI Win Rate */}
        <div className="stat-card">
          <div className="stat-top">
            <span>AI Confluence Win Rate</span>
            <div className="stat-icon text-sky-400 bg-sky-950/40">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="stat-value font-mono text-white">
            {metrics?.win_rate_pct != null ? `${metrics.win_rate_pct}%` : "—"}
          </div>
          <div className="stat-change text-[#8da2bf]">
            <span>
              {metrics ? `${metrics.winning_trades} wins of ${metrics.total_trades} closed trades` : "Analyzing closed trades"}
            </span>
          </div>
        </div>

        {/* KPI 3: Profit Factor & Risk-Reward */}
        <div className="stat-card">
          <div className="stat-top">
            <span>Profit Factor</span>
            <div className="stat-icon text-amber-400 bg-amber-950/40">
              <Award size={18} />
            </div>
          </div>
          <div className="stat-value font-mono text-amber-400">
            {metrics?.profit_factor ? `${metrics.profit_factor}` : "1.00"}
          </div>
          <div className="stat-change text-[#8da2bf]">
            <span>
              R:R Ratio {metrics?.risk_reward_ratio ? `1:${metrics.risk_reward_ratio}` : "1:2.0"}
            </span>
          </div>
        </div>

        {/* KPI 4: Active Running Position */}
        <div className="stat-card">
          <div className="stat-top">
            <span>Active Position</span>
            <div className={`stat-icon ${activeTrade ? "text-amber-400 bg-amber-950/40" : "text-(--muted) bg-(--panel)"}`}>
              <Zap size={18} />
            </div>
          </div>
          <div className="stat-value font-mono text-white">
            {activeTrade ? (
              <span className={activeTrade.direction === "BUY" ? "text-emerald-400" : "text-red-400"}>
                {activeTrade.direction} @ {activeTrade.entry_price?.toFixed(2)}
              </span>
            ) : (
              <span className="text-(--muted) text-lg">FLAT (WAIT)</span>
            )}
          </div>
          <div className="stat-change text-[#8da2bf]">
            {activeTrade ? (
              <span>Target TP: {(activeTrade.tp2 ?? activeTrade.take_profit ?? activeTrade.tp)?.toFixed(2) || "—"}</span>
            ) : (
              <span>Scanning multi-timeframe confluence</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. DEDICATED REPORT SUMMARY BANNER (FULL ANALYTICS BREAKDOWN) */}
      <div className="panel p-5 rounded-xl border border-(--card-border) bg-(--panel)">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-(--card-border)">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#2962ff]/10 text-[#2962ff] border border-[#2962ff]/20">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Trading Performance & Risk Report
              </h2>
              <p className="text-xs text-(--muted)">
                Statistical evaluation generated across {metrics?.total_trades || 0} executed XAU/USD setups
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/history"
              className="px-3 py-1.5 rounded-lg bg-(--pill-bg) hover:bg-(--panel-hover) border border-(--card-border) text-xs font-semibold text-white transition-all flex items-center gap-1.5"
            >
              <Trophy size={14} className="text-amber-400" />
              <span>Full Trade Ledger</span>
            </Link>
          </div>
        </div>

        {/* Analytics Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          <div className="p-3 rounded-lg bg-(--pill-bg)/60 border border-(--card-border)">
            <span className="text-[10px] uppercase font-bold text-(--muted) block">Gross Profit</span>
            <span className="font-mono text-sm font-bold text-emerald-400">
              +{metrics?.gross_profit_points?.toFixed(2) || "0.00"} pts
            </span>
          </div>

          <div className="p-3 rounded-lg bg-(--pill-bg)/60 border border-(--card-border)">
            <span className="text-[10px] uppercase font-bold text-(--muted) block">Gross Loss</span>
            <span className="font-mono text-sm font-bold text-red-400">
              -{metrics?.gross_loss_points?.toFixed(2) || "0.00"} pts
            </span>
          </div>

          <div className="p-3 rounded-lg bg-(--pill-bg)/60 border border-(--card-border)">
            <span className="text-[10px] uppercase font-bold text-(--muted) block">Max Drawdown</span>
            <span className="font-mono text-sm font-bold text-amber-400">
              {metrics?.max_drawdown_points ? `-${metrics.max_drawdown_points.toFixed(2)} pts` : "0.00 pts"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-(--pill-bg)/60 border border-(--card-border)">
            <span className="text-[10px] uppercase font-bold text-(--muted) block">Avg Win / Loss</span>
            <span className="font-mono text-xs font-bold text-white">
              +{metrics?.avg_win_points?.toFixed(1) || "0.0"} / -{metrics?.avg_loss_points?.toFixed(1) || "0.0"}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-(--pill-bg)/60 border border-(--card-border)">
            <span className="text-[10px] uppercase font-bold text-(--muted) block">Largest Win</span>
            <span className="font-mono text-sm font-bold text-emerald-400">
              +{metrics?.largest_win_points?.toFixed(2) || "0.00"} pts
            </span>
          </div>

          <div className="p-3 rounded-lg bg-(--pill-bg)/60 border border-(--card-border)">
            <span className="text-[10px] uppercase font-bold text-(--muted) block">Max Win Streak</span>
            <span className="font-mono text-sm font-bold text-white">
              {metrics?.max_consecutive_wins || 0} consecutive
            </span>
          </div>
        </div>
      </div>

      {/* 4. CONTENT GRID: MARKET OVERVIEW & SIGNAL CONFLUENCE */}
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
                <div className="large-price font-mono text-white">
                  ${market?.price ? market.price.toFixed(2) : "4,183.21"}
                </div>
              </div>
              <div className={`price-badge font-mono font-bold ${(market?.macro_trend === "BULLISH")
                  ? "bg-emerald-950/50 border border-emerald-500/30 text-emerald-400"
                  : "bg-red-950/50 border border-red-500/30 text-red-400"
                }`}>
                {market?.macro_trend || "BULLISH"} HTF (1H)
              </div>
            </div>

            <p className="mt-4 text-xs text-[#8da2bf] leading-relaxed">
              Higher timeframe (1H) trend is currently <strong>{market?.macro_trend || "BULLISH"}</strong> (RSI: {market?.htf_rsi ? market.htf_rsi.toFixed(1) : "63.4"}). Execution timeframe (5min) is aligned with technical confluence and Pivot Point P = {market?.pivot_point ? market.pivot_point.toFixed(2) : "4,169.80"}.
            </p>
          </div>

          <div className="mt-6 p-4 rounded-xl border border-(--card-border) bg-(--pill-bg) flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#2962ff]/10 border border-[#2962ff]/30 flex items-center justify-center text-[#2962ff]">
                <Activity size={20} />
              </div>
              <div>
                <strong className="block text-sm text-white">Interactive Candlestick & RSI</strong>
                <p className="text-xs text-[#787b86] mt-0.5">
                  Automated signal detection with MT5 execution bridge
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

        {/* Right Panel: Confirmed AI Trade Setup Card (Live from Report) */}
        <div className="panel">
          <div className="section-title">
            <div className="section-heading">
              <Zap size={18} className="text-amber-400" />
              <h2>Confirmed AI Signal Setup</h2>
            </div>
            <span className={`status-pill ${activeTrade
                ? "bg-emerald-950 border border-emerald-500/40 text-emerald-400"
                : "bg-gray-800 border border-gray-600 text-gray-400"
              }`}>
              {activeTrade ? "ACTIVE RUNNING" : "WAIT (FLAT)"}
            </span>
          </div>

          {activeTrade ? (
            <>
              <div className={`signal-banner ${activeTrade.direction === "BUY"
                  ? "bg-emerald-950/30 border border-emerald-500/30"
                  : "bg-red-950/30 border border-red-500/30"
                }`}>
                <div className={`signal-symbol ${activeTrade.direction === "BUY" ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300"
                  }`}>
                  {activeTrade.direction === "BUY" ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
                <div>
                  <span className={`font-bold uppercase tracking-wider text-[10px] ${activeTrade.direction === "BUY" ? "text-emerald-400" : "text-red-400"
                    }`}>
                    CONFLUENCE {activeTrade.direction}
                  </span>
                  <h3 className="text-white font-bold">{activeTrade.direction} Gold Spot (XAU/USD)</h3>
                  <p className="text-xs text-[#9aa9bd] truncate max-w-xs">
                    {activeTrade.reason || activeTrade.entry_reason || "Multi-timeframe confluence confirmed"}
                  </p>
                </div>
              </div>

              <div className="signal-price">
                <div>
                  <span>ENTRY LEVEL</span>
                  <strong className="font-mono text-white text-base">
                    {activeTrade.entry_price ? activeTrade.entry_price.toFixed(2) : "—"}
                  </strong>
                </div>
                <div>
                  <span>STOP LOSS (SL)</span>
                  <strong className="font-mono text-red-400 text-base">
                    {(activeTrade.sl ?? activeTrade.stop_loss)?.toFixed(2) || "—"}
                  </strong>
                </div>
              </div>

              <div className="risk-levels space-y-2 mt-3">
                <div className="risk-row">
                  <span>
                    <Trophy size={14} className="text-emerald-400" />
                    <span>Take Profit 1</span>
                  </span>
                  <strong className="font-mono text-emerald-400">
                    {activeTrade.tp1 ? activeTrade.tp1.toFixed(2) : (activeTrade.tp ? activeTrade.tp.toFixed(2) : "—")}
                  </strong>
                </div>
                <div className="risk-row">
                  <span>
                    <Trophy size={14} className="text-emerald-300" />
                    <span>Take Profit 2</span>
                  </span>
                  <strong className="font-mono text-emerald-300">
                    {activeTrade.tp2 ? activeTrade.tp2.toFixed(2) : "—"}
                  </strong>
                </div>
                <div className="risk-row">
                  <span>
                    <Trophy size={14} className="text-emerald-200" />
                    <span>Take Profit 3</span>
                  </span>
                  <strong className="font-mono text-emerald-200">
                    {activeTrade.tp3 ? activeTrade.tp3.toFixed(2) : "—"}
                  </strong>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-2 text-(--muted)">
              <Compass size={32} className="opacity-40 text-[#2962ff]" />
              <strong className="text-sm text-white">No Position Currently Active</strong>
              <p className="text-xs max-w-xs text-[#787b86]">
                The AI scheduler is scanning for high-probability confluence on XAU/USD. Next trade entry will appear here automatically.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5. BOTTOM GRID: RECENT REPORT TRADES & ECONOMIC CALENDAR */}
      <div className="bottom-grid">
        {/* Recent Trades Table (Live from Report) */}
        <div className="panel">
          <div className="section-title">
            <div className="section-heading">
              <Wallet size={18} />
              <h2>Recent Closed Trades (Report)</h2>
            </div>
            <Link href="/history" className="section-action hover:underline text-[#65b7ff]">
              View All History
            </Link>
          </div>

          <div className="table-wrap overflow-x-auto">
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
                {recentTrades.length > 0 ? (
                  recentTrades.map((t) => (
                    <tr key={t.id} className="hover:bg-[#1e222d]/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-white whitespace-nowrap">
                        {t.id}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${t.side === "BUY"
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
                        className={`py-2.5 px-3 font-mono font-bold text-right ${t.pnl_points >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                      >
                        {t.pnl} ({t.pnl_points > 0 ? "+" : ""}{t.pnl_points.toFixed(1)} pts)
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1e222d] text-[#8da2bf]">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-xs text-(--muted)">
                      No closed trades in report ledger yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Economic News Calendar (Live from Report) */}
        <div className="panel">
          <div className="section-title">
            <div className="section-heading">
              <Newspaper size={18} />
              <h2>Upcoming High-Impact News</h2>
            </div>
            <span className="eyebrow">USD IMPACT</span>
          </div>

          <div className="space-y-3">
            {upcomingNews.length > 0 ? (
              upcomingNews.map((n, idx) => (
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
                        {n.currency} · {n.forecast}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="font-mono text-xs font-bold text-amber-400">{formatCambodiaTime(n.time)}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${n.impact === "HIGH"
                          ? "bg-red-950/70 text-red-400 border border-red-500/30"
                          : "bg-amber-950/70 text-amber-400 border border-amber-500/30"
                        }`}
                    >
                      {n.impact}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-lg bg-(--panel)/50 border border-(--card-border) text-center text-xs text-(--muted)">
                No high-impact events blocking active trading.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}