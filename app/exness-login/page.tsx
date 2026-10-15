"use client";

import { useState, type FormEvent } from "react";

const API_URL = "http://127.0.0.1:8000";

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
  const [account, setAccount] =
    useState<RegisteredAccount | null>(null);

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
      const response = await fetch(
        `${API_URL}/api/accounts/register`,
        {
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
        }
      );

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
    <section className="mx-auto w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Register MT5 Account
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Connect your Exness demo account to your trading chart.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="accountName" className="mb-1 block text-sm font-medium">
            Account name
          </label>
          <input
            id="accountName"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            required
            maxLength={80}
            className="w-full rounded-lg border p-3 dark:border-gray-700 dark:bg-gray-800"
            placeholder="Exness Demo"
          />
        </div>

        <div>
          <label htmlFor="mt5Login" className="mb-1 block text-sm font-medium">
            MT5 login number
          </label>
          <input
            id="mt5Login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            inputMode="numeric"
            pattern="[0-9]+"
            autoComplete="off"
            className="w-full rounded-lg border p-3 dark:border-gray-700 dark:bg-gray-800"
            placeholder="Enter your demo login number"
          />
        </div>

        <div>
          <label htmlFor="mt5Server" className="mb-1 block text-sm font-medium">
            MT5 server
          </label>
          <input
            id="mt5Server"
            value={server}
            onChange={(e) => setServer(e.target.value)}
            required
            maxLength={150}
            autoComplete="off"
            className="w-full rounded-lg border p-3 dark:border-gray-700 dark:bg-gray-800"
            placeholder="Exact server name from MT5"
          />
        </div>

        <p className="text-xs text-gray-500">
          Never enter your MT5 trading password or EA token here.
        </p>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {account && (
          <div role="status" className="rounded-lg border border-green-300 p-4">
            <p className="font-semibold text-green-700">
              Account registered
            </p>
            <p className="mt-2 text-sm">Account ID: {account.id}</p>
            <p className="text-sm">MT5 login: {account.mt5_login}</p>
            <p className="text-sm">Server: {account.server}</p>
            <p className="text-sm">Status: {account.status}</p>
            <p className="mt-2 text-xs text-gray-500">
              Registration does not mean MT5 is connected yet.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Registering..." : "Register Demo Account"}
        </button>
      </form>
    </section>
  );
}
