
"use client";

import {
  Activity,
  ArrowDownRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crosshair,
  LayoutDashboard,
  Newspaper,
  Settings,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

import GoldCandlestickChart from "../components/GoldCandlestickChart";


type PricePoint = {
  time: string;
  price: number;
};

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

type StatCardProps = {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
};

type SectionTitleProps = {
  icon: React.ElementType;
  title: string;
  action?: string;
};

const priceData: PricePoint[] = [
  { time: "09:00", price: 4164.2 },
  { time: "09:15", price: 4166.8 },
  { time: "09:30", price: 4161.5 },
  { time: "09:45", price: 4163.1 },
  { time: "10:00", price: 4158.7 },
  { time: "10:15", price: 4160.4 },
  { time: "10:30", price: 4156.2 },
  { time: "10:45", price: 4158.8 },
  { time: "11:00", price: 4154.3 },
  { time: "11:15", price: 4156.1 },
  { time: "11:30", price: 4151.9 },
  { time: "11:45", price: 4153.5 },
  { time: "12:00", price: 4149.7 },
  { time: "12:15", price: 4152.4 },
  { time: "12:30", price: 4147.6 },
  { time: "12:45", price: 4149.1 },
  { time: "13:00", price: 4146.8 },
  { time: "13:15", price: 4148.5 },
  { time: "13:30", price: 4144.9 },
  { time: "13:45", price: 4148.058 },
];

const news: NewsEvent[] = [
  {
    time: "19:30",
    currency: "USD",
    impact: "HIGH",
    title: "Consumer Price Index (CPI)",
    forecast: "Upcoming",
  },
  {
    time: "21:00",
    currency: "USD",
    impact: "HIGH",
    title: "Federal Reserve Speech",
    forecast: "Upcoming",
  },
  {
    time: "22:30",
    currency: "USD",
    impact: "MEDIUM",
    title: "Crude Oil Inventories",
    forecast: "Upcoming",
  },
];

const trades: Trade[] = [
  {
    id: "TRD-001",
    side: "SELL",
    entry: "4147.617",
    exit: "—",
    pnl: "-0.44",
    status: "OPEN",
  },
  {
    id: "TRD-002",
    side: "BUY",
    entry: "4132.500",
    exit: "4141.200",
    pnl: "+8.70",
    status: "CLOSED",
  },
  {
    id: "TRD-003",
    side: "SELL",
    entry: "4158.300",
    exit: "4152.100",
    pnl: "+6.20",
    status: "CLOSED",
  },
];

function StatCard({
  title,
  value,
  change,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        <div className="stat-icon">
          <Icon size={19} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-change muted">{change}</div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  action,
}: SectionTitleProps) {
  return (
    <div className="section-title">
      <div className="section-heading">
        <Icon size={18} />
        <h2>{title}</h2>
      </div>
      {action && <span className="section-action">{action}</span>}
    </div>
  );
}

export default function Dashboard() {
  return (
    <main className="app-shell">
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
          <a className="nav-item active" href="#overview">
            <LayoutDashboard size={18} />
            Dashboard
          </a>
          <a className="nav-item" href="#analysis">
            <Activity size={18} />
            AI Analysis
          </a>
          <a className="nav-item" href="#trades">
            <Wallet size={18} />
            Trade History
          </a>
          <a className="nav-item" href="#performance">
            <TrendingUp size={18} />
            Performance
          </a>
          <a className="nav-item" href="#news">
            <Newspaper size={18} />
            Economic News
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-card">
            <span className="online-dot" />
            <div>
              <strong>System Online</strong>
              <p>Static preview mode</p>
            </div>
          </div>

          <a className="nav-item" href="#settings">
            <Settings size={18} />
            Settings
          </a>

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

      <div className="main-content" id="overview">
        <header className="topbar">
          <div>
            <div className="breadcrumb">Workspace / Dashboard</div>
            <h1>Trading Overview</h1>
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
              Oct 14, 2026
            </div>
          </div>
        </header>
        <section className="">
          <GoldCandlestickChart />


        </section>

      </div>
    </main>
  );
}
