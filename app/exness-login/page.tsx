"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

type RegisteredAccount = {
  id: number;
  account_name: string;
  mt5_login: string;
  server: string;
  status: string;
};

export default function ExnessAccountRegistration() {
  const [accountName, setAccountName] = useState("Exness Demo");
  const [login, setLogin] = useState("");
  const [server, setServer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [account, setAccount] = useState<RegisteredAccount | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setAccount(null);

    const mt5Login = login.trim();
    const mt5Server = server.trim();

    if (!accountName.trim() || !/^\d+$/.test(mt5Login) || !mt5Server) {
      setError("Enter an account name, numeric MT5 login, and server.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/accounts/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          account_name: accountName.trim(),
          mt5_login: mt5Login,
          server: mt5Server,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || `Registration failed (${response.status})`
        );
      }

      setAccount(data);
      setLogin("");
      setServer("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <header className="topbar">
        <div>
          <div className="breadcrumb">Workspace / Settings & Integrations</div>
          <h1>MetaTrader 5 & Exness Connection</h1>
        </div>
        <div className="topbar-actions">
          <div className="market-status">
            <span className="online-dot" />
            MT5 Bridge Active
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto my-6">
        <section className="rounded-xl border border-[#2a2e39] bg-[#131722] p-6 shadow-2xl text-[#d1d4dc]">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#2a2e39]">
            <div className="p-2.5 rounded-lg bg-[#2962ff]/10 border border-[#2962ff]/30 text-[#2962ff]">
              <KeyRound size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Register MT5 Account
              </h2>
              <p className="text-xs text-[#787b86] mt-0.5">
                Connect your Exness demo account to execute automated gold trades.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="accountName" className="block text-xs font-semibold text-[#8da2bf] mb-1.5 uppercase tracking-wide">
                Account Name / Label
              </label>
              <input
                id="accountName"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
                maxLength={80}
                className="w-full rounded-lg border border-[#2a2e39] bg-[#1e222d] px-3.5 py-2.5 text-sm text-white placeholder-[#787b86] focus:border-[#2962ff] focus:outline-none transition-colors"
                placeholder="Exness Demo"
              />
            </div>

            <div>
              <label htmlFor="mt5Login" className="block text-xs font-semibold text-[#8da2bf] mb-1.5 uppercase tracking-wide">
                MT5 Login Number
              </label>
              <input
                id="mt5Login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                inputMode="numeric"
                pattern="[0-9]+"
                autoComplete="off"
                className="w-full rounded-lg border border-[#2a2e39] bg-[#1e222d] px-3.5 py-2.5 text-sm font-mono text-white placeholder-[#787b86] focus:border-[#2962ff] focus:outline-none transition-colors"
                placeholder="e.g. 19283746"
              />
            </div>

            <div>
              <label htmlFor="mt5Server" className="block text-xs font-semibold text-[#8da2bf] mb-1.5 uppercase tracking-wide">
                MT5 Server
              </label>
              <input
                id="mt5Server"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                required
                maxLength={150}
                autoComplete="off"
                className="w-full rounded-lg border border-[#2a2e39] bg-[#1e222d] px-3.5 py-2.5 text-sm font-mono text-white placeholder-[#787b86] focus:border-[#2962ff] focus:outline-none transition-colors"
                placeholder="e.g. Exness-MT5Trial10"
              />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-xs text-[#787b86]">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span>
                Antigravity security notice: Never enter trading passwords or private tokens here.
              </span>
            </div>

            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-lg bg-red-950/40 border border-red-500/40 p-3 text-xs text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {account && (
              <div role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs text-emerald-300 space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-400 mb-2">
                  <CheckCircle2 size={18} />
                  <span>Account Registered Successfully</span>
                </div>
                <p>Account ID: <span className="font-mono text-white font-semibold">{account.id}</span></p>
                <p>MT5 Login: <span className="font-mono text-white font-semibold">{account.mt5_login}</span></p>
                <p>Server: <span className="font-mono text-white font-semibold">{account.server}</span></p>
                <p>Status: <span className="font-mono text-emerald-400 font-semibold">{account.status}</span></p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#2962ff] hover:bg-[#1e4bd8] disabled:bg-[#2962ff]/50 px-4 py-2.5 font-semibold text-white text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-[#2962ff]/20"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                "Register MT5 Account"
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
