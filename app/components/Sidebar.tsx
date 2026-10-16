"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  ChevronDown,
  History,
  LayoutDashboard,
  Moon,
  Newspaper,
  Settings,
  Sun,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import GoogleTranslate from "./GoogleTranslate";

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const isDashboard = pathname === "/" || pathname === "/dashboard";
  const isAnalysis = pathname === "/chart";
  const isHistory = pathname === "/history";
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
          className={`nav-item ${isHistory ? "active" : ""}`}
          href="/history"
        >
          <History size={18} />
          History
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
          href="http://0.0.0.0:3000/"
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

        {/* Language Translator (KH / ENG) */}
        <GoogleTranslate variant="sidebar" />

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="nav-item w-full flex items-center justify-between mb-1.5 cursor-pointer border border-transparent hover:border-(--border) transition-all"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          <div className="flex items-center gap-3">
            {theme === "dark" ? (
              <Sun size={18} className="text-amber-400" />
            ) : (
              <Moon size={18} className="text-blue-600" />
            )}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-(--panel-hover) text-(--muted)">
            {theme}
          </span>
        </button>

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
