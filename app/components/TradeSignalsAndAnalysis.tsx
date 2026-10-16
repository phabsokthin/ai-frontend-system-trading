"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Compass,
  Layers,
  Newspaper,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_MARKET_API_URL?.replace(/\/api\/candles\/?$/, "") ??
  "http://localhost:8000";

type ActivePosition = {
  id?: string;
  direction?: string;
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
  entry_time?: string;
  current_price?: number;
  unrealized_pnl_points?: number;
};

type TradeHistoryItem = {
  id: string;
  direction: "BUY" | "SELL";
  entry_price: number;
  exit_price?: number;
  stop_loss?: number;
  take_profit?: number;
  sl?: number;
  tp?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  final_pnl_points?: number;
  pnl_points?: number;
  status: string;
  exit_reason?: string;
  entry_time?: string;
  exit_time?: string;
  timeframe?: string;
};

type SignalItem = {
  setup_id?: string;
  analysis_id?: string;
  timestamp_utc: string;
  symbol: string;
  signal: "BUY" | "SELL" | "WAIT";
  action?: string;
  price?: number;
  stop_loss?: number;
  take_profit?: number;
  reason?: string;
  setup?: {
    direction?: string;
    entry_price?: number;
    stop_loss?: number;
    take_profit?: number;
    tp1?: number;
    tp2?: number;
    tp3?: number;
    confidence?: string;
    risk_reward_ratio?: number;
    reasons?: string[];
  };
  is_new_entry?: boolean;
};

type LatestAnalysis = {
  timestamp_utc?: string;
  symbol?: string;
  price?: number;
  signal?: string;
  action?: string;
  trade_status?: string;
  reason?: string;
  stop_loss?: number;
  take_profit?: number;
  tp?: number;
  sl?: number;
  multi_timeframe?: {
    analysis_timeframe?: string;
    htf_trend?: string;
    htf_rsi?: number;
    entry_timeframe?: string;
    entry_signal?: string;
    ltf_signal?: string;
    timeframe_aligned?: boolean;
  };
  support_resistance?: {
    current_price?: number;
    pivot_point?: number;
    classic?: {
      pivot?: number;
      r1?: number;
      r2?: number;
      r3?: number;
      s1?: number;
      s2?: number;
      s3?: number;
    };
    nearest_support?: number;
    nearest_resistance?: number;
    distance_to_support?: number;
    distance_to_resistance?: number;
    zone?: string;
  };
  news_filter?: {
    allowed?: boolean;
    reason?: string;
    news_analysis?: {
      status?: string;
      has_news_today?: boolean;
      market_news_note?: string;
      active_blocking_event?: { name?: string; time?: string };
      next_event?: { name?: string; time?: string; minutes_until?: number; hours_until?: number; impact?: string };
    };
  };
  news_analysis?: {
    status?: string;
    market_news_note?: string;
    next_event?: { name?: string; time?: string; minutes_until?: number; hours_until?: number; impact?: string };
  };
};

interface TradeSignalsAndAnalysisProps {
  initialTab?: "signals" | "trades" | "analysis";
}

export default function TradeSignalsAndAnalysis({
  initialTab = "signals",
}: TradeSignalsAndAnalysisProps) {
  const [activeTab, setActiveTab] = useState<"signals" | "trades" | "analysis">(initialTab);
  const [activeTrade, setActiveTrade] = useState<ActivePosition | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [signalsHistory, setSignalsHistory] = useState<SignalItem[]>([]);
  const [latestAnalysis, setLatestAnalysis] = useState<LatestAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch all live data
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch active trade
      const activePromise = fetch(`${BACKEND_BASE_URL}/api/trades/active`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      // 2. Fetch trade history
      const historyPromise = fetch(`${BACKEND_BASE_URL}/api/trades/history?limit=25`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      // 3. Fetch signal history
      const signalsPromise = fetch(`${BACKEND_BASE_URL}/api/signals/history?limit=25`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      // 4. Fetch latest scheduled analysis
      const analysisPromise = fetch(`${BACKEND_BASE_URL}/api/analysis/latest`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const [activeRes, historyRes, signalsRes, analysisRes] = await Promise.all([
        activePromise,
        historyPromise,
        signalsPromise,
        analysisPromise,
      ]);

      if (activeRes && activeRes.active && (activeRes.position || activeRes.setup)) {
        setActiveTrade(activeRes.position || activeRes.setup);
      } else {
        setActiveTrade(null);
      }

      if (historyRes && Array.isArray(historyRes.trades)) {
        setTradeHistory(historyRes.trades);
      }

      if (signalsRes && Array.isArray(signalsRes.signals)) {
        setSignalsHistory(signalsRes.signals);
      }

      if (analysisRes) {
        setLatestAnalysis(analysisRes);
      }

      setLastRefreshed(new Date().toLocaleTimeString());
    } catch {
      // ignore
    }
  }, []);

  // Initial & Interval refresh
  useEffect(() => {
    fetchData();
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData, autoRefresh]);

  // Handle URL hash navigation
  useEffect(() => {
    const handleHash = () => {
      if (typeof window !== "undefined") {
        const hash = window.location.hash;
        if (hash === "#trades") setActiveTab("trades");
        else if (hash === "#analysis" || hash === "#performance") setActiveTab("analysis");
        else if (hash === "#signals") setActiveTab("signals");
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const handleManualRefresh = async () => {
    setLoading(true);
    await fetchData();
    setTimeout(() => setLoading(false), 500);
  };

  const handleResetActiveTrade = async () => {
    if (!confirm("Are you sure you want to emergency-reset the active position?")) return;
    try {
      await fetch(`${BACKEND_BASE_URL}/api/trades/reset`, { method: "POST" });
      await fetchData();
    } catch (e) {
      alert("Reset failed: " + e);
    }
  };

  // Helper formatting
  const formatTime = (iso?: string) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " · " + d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  };

  // KPI Calculations
  const totalTrades = tradeHistory.length;
  const winTrades = tradeHistory.filter((t) => (t.final_pnl_points ?? t.pnl_points ?? 0) > 0).length;
  const winRate = totalTrades > 0 ? ((winTrades / totalTrades) * 100).toFixed(1) : "0.0";
  const totalPnlPoints = tradeHistory.reduce((acc, t) => acc + (t.final_pnl_points ?? t.pnl_points ?? 0), 0);

  return (
    <div id="trades" className="mt-6 w-full rounded-xl border border-(--card-border) bg-(--card-bg) shadow-lg overflow-hidden text-(--card-text)">
      {/* 1. COMPONENT HEADER & TABS BAR */}
      <div className="flex flex-wrap items-center justify-between border-b border-(--card-border) bg-(--panel) px-4 py-3 gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-(--pill-bg) border border-(--card-border)">
          <button
            type="button"
            onClick={() => setActiveTab("signals")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "signals"
                ? "bg-[#2962ff] text-white shadow-sm"
                : "text-(--muted) hover:text-(--card-text)"
            }`}
          >
            <Zap size={14} className={activeTrade ? "text-amber-300 animate-pulse" : ""} />
            <span>AI Signals & Setups</span>
            {activeTrade && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("trades")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "trades"
                ? "bg-[#2962ff] text-white shadow-sm"
                : "text-(--muted) hover:text-(--card-text)"
            }`}
          >
            <Wallet size={14} />
            <span>Closed Trade History</span>
            <span className="px-1.5 py-0.2 rounded-full bg-(--card-bg) text-[10px] text-(--muted) font-mono">
              {totalTrades}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("analysis")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "analysis"
                ? "bg-[#2962ff] text-white shadow-sm"
                : "text-(--muted) hover:text-(--card-text)"
            }`}
          >
            <BarChart3 size={14} />
            <span>AI Multi-Timeframe Analysis</span>
          </button>
        </div>

        {/* Status Actions */}
        <div className="flex items-center gap-3 text-xs text-(--muted)">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium hidden sm:inline">MongoDB Live Sync</span>
          </div>

          {lastRefreshed && (
            <span className="text-[11px] font-mono hidden md:inline">
              Refreshed: {lastRefreshed}
            </span>
          )}

          <button
            type="button"
            onClick={handleManualRefresh}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-(--pill-bg) hover:bg-(--panel-hover) border border-(--card-border) text-xs font-medium transition-colors cursor-pointer"
            title="Refresh signals, analysis, and trade history"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[#2962ff]" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. TAB 1: AI SIGNALS & ACTIVE SETUPS */}
      {activeTab === "signals" && (
        <div className="p-4 sm:p-5 space-y-6">
          {/* Active Live Setup Hero Card */}
          {activeTrade ? (
            <div className={`p-4 rounded-xl border relative overflow-hidden backdrop-blur-md transition-all ${
              activeTrade.direction === "BUY"
                ? "border-emerald-500/40 bg-emerald-950/20 shadow-emerald-950/20"
                : "border-red-500/40 bg-red-950/20 shadow-red-950/20"
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-(--card-border)/60">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${activeTrade.direction === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {activeTrade.direction === "BUY" ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                        activeTrade.direction === "BUY"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-red-500/20 text-red-400 border border-red-500/40"
                      }`}>
                        CONFIRMED {activeTrade.direction} SETUP
                      </span>
                      <span className="text-[11px] text-(--muted) font-mono">
                        ID: {activeTrade.id || "live_active"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      XAU/USD · Gold Spot Position Running
                    </h3>
                  </div>
                </div>

                {/* Unrealized PnL badge */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-(--muted) block">Unrealized PnL</span>
                    <span className={`font-mono font-bold text-sm ${
                      (activeTrade.unrealized_pnl_points ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {(activeTrade.unrealized_pnl_points ?? 0) >= 0 ? "+" : ""}
                      {(activeTrade.unrealized_pnl_points ?? 0).toFixed(2)} pts
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetActiveTrade}
                    className="p-1.5 rounded-lg bg-(--pill-bg) hover:bg-red-950/40 text-(--muted) hover:text-red-400 border border-(--card-border) transition-all cursor-pointer"
                    title="Emergency reset active position to flat"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              {/* Price Target Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3">
                <div className="p-2.5 rounded-lg bg-(--panel)/80 border border-(--card-border)">
                  <span className="text-[10px] uppercase font-semibold text-(--muted) flex items-center gap-1">
                    <Target size={11} className="text-[#2962ff]" /> Entry Price
                  </span>
                  <span className="font-mono text-sm font-bold text-white">
                    {activeTrade.entry_price ? activeTrade.entry_price.toFixed(2) : "—"}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-(--panel)/80 border border-(--card-border)">
                  <span className="text-[10px] uppercase font-semibold text-(--muted) flex items-center gap-1">
                    <ShieldAlert size={11} className="text-red-400" /> Stop Loss
                  </span>
                  <span className="font-mono text-sm font-bold text-red-400">
                    {(activeTrade.sl ?? activeTrade.stop_loss) ? (activeTrade.sl ?? activeTrade.stop_loss)?.toFixed(2) : "—"}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-(--panel)/80 border border-(--card-border)">
                  <span className="text-[10px] uppercase font-semibold text-(--muted) block items-center gap-1">
                    <Trophy size={11} className="text-emerald-400" /> Target TP 1
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {activeTrade.tp1 ? activeTrade.tp1.toFixed(2) : (activeTrade.tp ? activeTrade.tp.toFixed(2) : "—")}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-(--panel)/80 border border-(--card-border)">
                  <span className="text-[10px] uppercase font-semibold text-(--muted) block items-center gap-1">
                    <Trophy size={11} className="text-emerald-300" /> Target TP 2
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-300">
                    {activeTrade.tp2 ? activeTrade.tp2.toFixed(2) : "—"}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-(--panel)/80 border border-(--card-border)">
                  <span className="text-[10px] uppercase font-semibold text-(--muted) flex items-center gap-1">
                    <Trophy size={11} className="text-emerald-200" /> Target TP 3
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-200">
                    {activeTrade.tp3 ? activeTrade.tp3.toFixed(2) : "—"}
                  </span>
                </div>
              </div>

              {/* Confluence Reasoning */}
              {(activeTrade.reason || activeTrade.entry_reason) && (
                <div className="mt-3 text-xs text-(--muted) flex items-start gap-2 pt-2 border-t border-(--card-border)/50">
                  <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-(--card-text)">Confluence Trigger:</strong> {activeTrade.reason || activeTrade.entry_reason}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-(--card-border) bg-(--panel)/40 text-center">
              <Compass size={28} className="mx-auto text-(--muted) opacity-50 mb-2" />
              <h4 className="text-sm font-semibold text-white">No Active Open Position</h4>
              <p className="text-xs text-(--muted) mt-1 max-w-md mx-auto">
                The market guard is in <strong>WAIT</strong> mode. Technical confluence and economic news safety filters are monitoring for the next validated entry.
              </p>
            </div>
          )}

          {/* Historical Confirmed Signals List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#2962ff]" />
                <h3 className="text-sm font-bold text-white">Confirmed AI Signals List (MongoDB)</h3>
              </div>
              <span className="text-xs text-(--muted)">
                {signalsHistory.length} recorded signals
              </span>
            </div>

            {signalsHistory.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-(--card-border)">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-(--card-border) bg-(--panel) text-(--muted)">
                      <th className="py-2.5 px-3">Time (UTC)</th>
                      <th className="py-2.5 px-3">Symbol</th>
                      <th className="py-2.5 px-3">Signal</th>
                      <th className="py-2.5 px-3">Entry Price</th>
                      <th className="py-2.5 px-3">Stop Loss</th>
                      <th className="py-2.5 px-3">Take Profit</th>
                      <th className="py-2.5 px-3">R:R Ratio</th>
                      <th className="py-2.5 px-3">Trigger Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--card-border)">
                    {signalsHistory.map((s, idx) => {
                      const dir = s.signal || s.setup?.direction || "WAIT";
                      const entry = s.price || s.setup?.entry_price;
                      const sl = s.stop_loss || s.setup?.stop_loss;
                      const tp = s.take_profit || s.setup?.take_profit;
                      const rr = s.setup?.risk_reward_ratio || 2.0;

                      return (
                        <tr key={s.setup_id || idx} className="hover:bg-(--panel)/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-(--muted) whitespace-nowrap">
                            {formatTime(s.timestamp_utc)}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white">
                            {s.symbol || "XAU/USD"}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              dir === "BUY"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : dir === "SELL"
                                ? "bg-red-500/15 text-red-400 border border-red-500/30"
                                : "bg-gray-500/15 text-gray-400 border border-gray-500/30"
                            }`}>
                              {dir === "BUY" ? <ArrowUpRight size={11} /> : dir === "SELL" ? <ArrowDownRight size={11} /> : null}
                              {dir}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-white">
                            {entry ? Number(entry).toFixed(2) : "—"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-red-400">
                            {sl ? Number(sl).toFixed(2) : "—"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-emerald-400">
                            {tp ? Number(tp).toFixed(2) : "—"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-(--muted)">
                            1:{rr}
                          </td>
                          <td className="py-2.5 px-3 text-(--muted) max-w-xs truncate" title={s.reason}>
                            {s.reason || "Technical indicators confluence confirmed"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-(--panel)/50 border border-(--card-border) text-center text-xs text-(--muted)">
                No historical signals recorded in MongoDB yet. Signals will appear here when new technical entries are generated.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. TAB 2: CLOSED TRADE HISTORY */}
      {activeTab === "trades" && (
        <div className="p-4 sm:p-5 space-y-6">
          {/* Performance Summary KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-(--card-border) bg-(--panel)">
              <span className="text-[11px] text-(--muted) block">Total Closed Trades</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {totalTrades}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-(--card-border) bg-(--panel)">
              <span className="text-[11px] text-(--muted) block">Win Rate %</span>
              <span className={`text-xl font-bold font-mono mt-1 block ${Number(winRate) >= 50 ? "text-emerald-400" : "text-amber-400"}`}>
                {winRate}%
              </span>
              <span className="text-[10px] text-(--muted)">{winTrades} profitable trades</span>
            </div>

            <div className="p-3.5 rounded-xl border border-(--card-border) bg-(--panel)">
              <span className="text-[11px] text-(--muted) block">Net Realized Points</span>
              <span className={`text-xl font-bold font-mono mt-1 block ${totalPnlPoints >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalPnlPoints >= 0 ? "+" : ""}{totalPnlPoints.toFixed(2)} pts
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-(--card-border) bg-(--panel)">
              <span className="text-[11px] text-(--muted) block">Est. PnL (0.1 Lot)</span>
              <span className={`text-xl font-bold font-mono mt-1 block ${totalPnlPoints >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {totalPnlPoints >= 0 ? "+" : ""}${(totalPnlPoints * 10).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Closed Trades History Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy size={16} className="text-amber-400" />
                Closed Trades History Log
              </h3>
              <span className="text-xs text-(--muted)">
                Archived from MongoDB & trade_history.jsonl
              </span>
            </div>

            {tradeHistory.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-(--card-border)">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-(--card-border) bg-(--panel) text-(--muted)">
                      <th className="py-2.5 px-3">Ticket / ID</th>
                      <th className="py-2.5 px-3">Side</th>
                      <th className="py-2.5 px-3">Entry Price</th>
                      <th className="py-2.5 px-3">Exit Price</th>
                      <th className="py-2.5 px-3">SL / TP</th>
                      <th className="py-2.5 px-3">Realized PnL</th>
                      <th className="py-2.5 px-3">Exit Reason</th>
                      <th className="py-2.5 px-3">Exit Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--card-border)">
                    {tradeHistory.map((t, idx) => {
                      const pnl = t.final_pnl_points ?? t.pnl_points ?? 0;
                      const isWin = pnl >= 0;

                      return (
                        <tr key={t.id || idx} className="hover:bg-(--panel)/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-medium text-white whitespace-nowrap">
                            {t.id}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.direction === "BUY"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-red-500/15 text-red-400 border border-red-500/30"
                            }`}>
                              {t.direction}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-(--card-text)">
                            {t.entry_price ? Number(t.entry_price).toFixed(2) : "—"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-white font-bold">
                            {t.exit_price ? Number(t.exit_price).toFixed(2) : "—"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-(--muted)">
                            <span className="text-red-400">{(t.sl ?? t.stop_loss)?.toFixed(1)}</span> / <span className="text-emerald-400">{(t.tp ?? t.take_profit)?.toFixed(1)}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 ${isWin ? "text-emerald-400" : "text-red-400"}`}>
                              {isWin ? "+" : ""}{Number(pnl).toFixed(2)} pts
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-(--muted) max-w-xs truncate" title={t.exit_reason}>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              t.status === "CLOSED_TP"
                                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                : t.status === "CLOSED_SL"
                                ? "bg-red-500/10 text-red-300 border border-red-500/20"
                                : "bg-gray-500/10 text-gray-300"
                            }`}>
                              {t.status || t.exit_reason || "CLOSED"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-(--muted) whitespace-nowrap">
                            {formatTime(t.exit_time)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-(--panel)/50 border border-(--card-border) text-center text-xs text-(--muted)">
                No closed trades recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 3: REAL-TIME MULTI-TIMEFRAME ANALYSIS */}
      {activeTab === "analysis" && (
        <div className="p-4 sm:p-5 space-y-6">
          {latestAnalysis ? (
            <>
              {/* Macro & Indicators Status Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Macro Trend Card */}
                <div className="p-4 rounded-xl border border-(--card-border) bg-(--panel) flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-(--muted) tracking-wider block">
                      Macro Trend ({latestAnalysis.multi_timeframe?.analysis_timeframe || "1H"})
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        latestAnalysis.multi_timeframe?.htf_trend === "BULLISH"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : latestAnalysis.multi_timeframe?.htf_trend === "BEARISH"
                          ? "bg-red-500/20 text-red-400 border border-red-500/40"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      }`}>
                        {latestAnalysis.multi_timeframe?.htf_trend || "NEUTRAL"}
                      </span>
                      <span className="text-xs text-white font-mono font-semibold">
                        {latestAnalysis.symbol || "XAU/USD"} @ {latestAnalysis.price?.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-(--card-border)/60 flex items-center justify-between text-xs">
                    <span className="text-(--muted)">HTF RSI 14:</span>
                    <span className="font-mono font-bold text-white">
                      {latestAnalysis.multi_timeframe?.htf_rsi != null
                        ? latestAnalysis.multi_timeframe.htf_rsi.toFixed(2)
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* 2. Micro Entry Execution Card */}
                <div className="p-4 rounded-xl border border-(--card-border) bg-(--panel) flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-(--muted) tracking-wider block">
                      Execution Trigger ({latestAnalysis.multi_timeframe?.entry_timeframe || "5MIN"})
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        latestAnalysis.signal === "BUY"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : latestAnalysis.signal === "SELL"
                          ? "bg-red-500/20 text-red-400 border border-red-500/40"
                          : "bg-gray-500/20 text-gray-300 border border-gray-500/40"
                      }`}>
                        SIGNAL: {latestAnalysis.signal || "WAIT"}
                      </span>
                      <span className="text-xs text-(--muted)">
                        Action: <strong className="text-white">{latestAnalysis.action || "WAIT"}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-(--card-border)/60 text-xs text-(--muted) truncate" title={latestAnalysis.reason}>
                    {latestAnalysis.reason || "Monitoring indicator alignment"}
                  </div>
                </div>

                {/* 3. Economic News Safety Card */}
                <div className="p-4 rounded-xl border border-(--card-border) bg-(--panel) flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-(--muted) tracking-wider block">
                      Economic News Filter
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        latestAnalysis.news_filter?.allowed
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                      }`}>
                        {latestAnalysis.news_filter?.allowed ? "CLEAR FOR TRADING" : "TRADING BLOCKED"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-(--card-border)/60 text-xs text-(--muted) truncate">
                    {latestAnalysis.news_analysis?.market_news_note || latestAnalysis.news_filter?.reason || "No high-impact USD events active"}
                  </div>
                </div>
              </div>

              {/* Support & Resistance Pivot Levels Table */}
              {latestAnalysis.support_resistance && (
                <div className="p-4 rounded-xl border border-(--card-border) bg-(--panel)">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-sky-400" />
                      <h4 className="text-sm font-bold text-white">Classic Support & Resistance Pivots</h4>
                    </div>
                    {latestAnalysis.support_resistance.zone && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2962ff]/10 text-[#93c5fd] border border-[#2962ff]/30">
                        ZONE: {latestAnalysis.support_resistance.zone}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 text-center text-xs">
                    {/* S3 */}
                    <div className="p-2 rounded-lg bg-(--pill-bg) border border-red-500/30">
                      <span className="text-[10px] font-bold text-red-400 block">S3</span>
                      <span className="font-mono font-semibold text-white">
                        {latestAnalysis.support_resistance.classic?.s3?.toFixed(2) || "—"}
                      </span>
                    </div>

                    {/* S2 */}
                    <div className="p-2 rounded-lg bg-(--pill-bg) border border-red-500/30">
                      <span className="text-[10px] font-bold text-red-400 block">S2</span>
                      <span className="font-mono font-semibold text-white">
                        {latestAnalysis.support_resistance.classic?.s2?.toFixed(2) || "—"}
                      </span>
                    </div>

                    {/* S1 */}
                    <div className="p-2 rounded-lg bg-(--pill-bg) border border-red-500/30">
                      <span className="text-[10px] font-bold text-red-400 block">S1</span>
                      <span className="font-mono font-semibold text-white">
                        {latestAnalysis.support_resistance.classic?.s1?.toFixed(2) || "—"}
                      </span>
                    </div>

                    {/* Pivot */}
                    <div className="p-2 rounded-lg bg-[#2962ff]/20 border border-[#2962ff]/50">
                      <span className="text-[10px] font-bold text-[#93c5fd] block">PIVOT (P)</span>
                      <span className="font-mono font-bold text-white">
                        {latestAnalysis.support_resistance.classic?.pivot?.toFixed(2) || latestAnalysis.support_resistance.pivot_point?.toFixed(2) || "—"}
                      </span>
                    </div>

                    {/* R1 */}
                    <div className="p-2 rounded-lg bg-(--pill-bg) border border-emerald-500/30">
                      <span className="text-[10px] font-bold text-emerald-400 block">R1</span>
                      <span className="font-mono font-semibold text-white">
                        {latestAnalysis.support_resistance.classic?.r1?.toFixed(2) || "—"}
                      </span>
                    </div>

                    {/* R2 */}
                    <div className="p-2 rounded-lg bg-(--pill-bg) border border-emerald-500/30">
                      <span className="text-[10px] font-bold text-emerald-400 block">R2</span>
                      <span className="font-mono font-semibold text-white">
                        {latestAnalysis.support_resistance.classic?.r2?.toFixed(2) || "—"}
                      </span>
                    </div>

                    {/* R3 */}
                    <div className="p-2 rounded-lg bg-(--pill-bg) border border-emerald-500/30">
                      <span className="text-[10px] font-bold text-emerald-400 block">R3</span>
                      <span className="font-mono font-semibold text-white">
                        {latestAnalysis.support_resistance.classic?.r3?.toFixed(2) || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 rounded-lg bg-(--panel)/50 border border-(--card-border) text-center text-xs text-(--muted)">
              Analysis data loading or pending background scheduler run...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
