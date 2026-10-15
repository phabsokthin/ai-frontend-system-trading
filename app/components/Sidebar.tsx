"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  ChevronDown,
  LayoutDashboard,
  Newspaper,
  Settings,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const isDashboard = pathname === "/" || pathname === "/dashboard";
  const isAnalysis = pathname === "/chart";
  const isExness = pathname === "/exness-login";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">
          <BarChart3 size={23} />
        </div>
        <div>
          <strong>GoldPilot</strong>
          <span>AI TRADING SYSTEM</span>
        </div>
      </div>

      <div className="nav-label">WORKSPACE</div>

      <nav className="navigation">
        <Link
          className={`nav-item ${isDashboard ? "active" : ""}`}
          href="/dashboard"
        >
          <LayoutDashboard size={18} />
          Dashboard
        </Link>
        <Link
          className={`nav-item ${isAnalysis ? "active" : ""}`}
          href="/chart"
        >
          <Activity size={18} />
          AI Analysis
        </Link>
        <Link
          className="nav-item"
          href="/chart#trades"
        >
          <Wallet size={18} />
          Trade History
        </Link>
        <Link
          className="nav-item"
          href="/chart#performance"
        >
          <TrendingUp size={18} />
          Performance
        </Link>
        <Link
          className="nav-item"
          href="/dashboard#news"
        >
          <Newspaper size={18} />
          Economic News
        </Link>
        <Link
          className={`nav-item ${isExness ? "active" : ""}`}
          href="/exness-login"
        >
          <Zap size={18} />
          Exness / MT5
        </Link>
      </nav>

      <div className="sidebar-bottom">
        <div className="connection-card">
          <span className="online-dot" />
          <div>
            <strong>System Online</strong>
            <p>MetaTrader 5 Bridge</p>
          </div>
        </div>

        <Link
          className={`nav-item ${pathname === "/settings" ? "active" : ""}`}
          href="/exness-login"
        >
          <Settings size={18} />
          Settings
        </Link>

        <div className="profile">
          <div className="avatar">AI</div>
          <div className="profile-info">
            <strong>Trading System</strong>
            <span>Administrator</span>
          </div>
          <ChevronDown size={16} />
        </div>
      </div>
    </aside>
  );
}
