"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type LineData,
  type CandlestickData,
} from "lightweight-charts";
import {
  Activity,
  BarChart3,
  Brush,
  Clock,
  Moon,
  RefreshCw,
  ShieldAlert,
  Sun,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { DrawingManager } from "lightweight-charts-drawing";
import ChartDrawingLayer from "./ChartDrawingLayer";

const API_URL =
  process.env.NEXT_PUBLIC_MARKET_API_URL ??
  "http://localhost:8000/api/candles";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.NEXT_PUBLIC_MARKET_API_URL?.replace(/\/api\/candles\/?$/, "") ??
  "http://localhost:8000";

const WS_URL =
  process.env.NEXT_PUBLIC_MARKET_WS_URL ??
  process.env.NEXT_PUBLIC_WS_URL ??
  "ws://localhost:8000/ws/live";

const MAX_RECONNECT_DELAY = 30000;

const INTERVAL_SECONDS: Record<string, number> = {
  "1min": 60,
  "5min": 300,
  "15min": 900,
  "30min": 1800,
  "1h": 3600,
  "4h": 14400,
  "1day": 86400,
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1H": 3600,
  "4H": 14400,
  "1D": 86400,
};

type Candle = {
  time: UTCTimestamp;
  datetime?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  ema9?: number | null;
  ema21?: number | null;
  ema50?: number | null;
  rsi?: number | null;
  atr?: number | null;
};

type ApiResponse = {
  success: boolean;
  symbol?: string;
  interval?: string;
  count?: number;
  current_price?: number;
  candles: Candle[];
  message?: string;
  detail?: string;
};

type LiveMessage = {
  type?: string;
  symbol?: string;
  interval?: string;
  current_price?: number;
  price?: number;
  candle?: Partial<Candle>;
  candles?: Partial<Candle>[];
  data?: Partial<Candle> | Partial<Candle>[];
  timestamp?: number | string;
  time?: number | string;
  datetime?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  ema9?: number | null;
  ema21?: number | null;
  ema50?: number | null;
  rsi?: number | null;
  atr?: number | null;
};

const TIMEFRAMES = [
  { value: "1min", label: "1m" },
  { value: "5min", label: "5m" },
  { value: "15min", label: "15m" },
  { value: "30min", label: "30m" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1day", label: "1D" },
];

function formatPrice(value?: number | null) {
  return value != null && Number.isFinite(value)
    ? value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    })
    : "—";
}

function Stat({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-3 sm:p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function calculateRSI(
  candles: Candle[],
  period = 14
): LineData<UTCTimestamp>[] {
  if (candles.length <= period) return [];

  const results: LineData<UTCTimestamp>[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }

  avgGain /= period;
  avgLoss /= period;

  const getRSI = () => {
    if (avgGain === 0 && avgLoss === 0) return 50;
    if (avgLoss === 0) return 100;
    if (avgGain === 0) return 0;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  };

  results.push({
    time: candles[period].time,
    value: getRSI(),
  });

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = Math.max(diff, 0);
    const loss = Math.max(-diff, 0);

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    results.push({
      time: candles[i].time,
      value: getRSI(),
    });
  }

  return results;
}

function normalizeCandle(
  raw: Partial<Candle> & { timestamp?: number | string }
): Candle | null {
  const rawTime = raw.time ?? raw.timestamp;
  let timestamp = Number(rawTime);

  if (!Number.isFinite(timestamp)) {
    if (typeof raw.datetime === "string") {
      timestamp = Math.floor(
        new Date(raw.datetime.replace(" ", "T")).getTime() / 1000
      );
    }
  } else if (timestamp > 1e12) {
    timestamp = Math.floor(timestamp / 1000);
  } else {
    timestamp = Math.floor(timestamp);
  }

  const open = Number(raw.open);
  const high = Number(raw.high);
  const low = Number(raw.low);
  const close = Number(raw.close);

  if (
    !Number.isFinite(timestamp) ||
    timestamp <= 0 ||
    ![open, high, low, close].every(Number.isFinite)
  ) {
    return null;
  }

  const optionalNumber = (value: unknown): number | null => {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  return {
    time: timestamp as UTCTimestamp,
    datetime: raw.datetime,
    open,
    high,
    low,
    close,
    ema9: optionalNumber(raw.ema9),
    ema21: optionalNumber(raw.ema21),
    ema50: optionalNumber(raw.ema50),
    rsi: optionalNumber(raw.rsi),
    atr: optionalNumber(raw.atr),
  };
}

function mergeCandles(
  previous: Candle[],
  incoming: Candle[],
  limit: number
): Candle[] {
  const byTime = new Map<number, Candle>();

  for (const candle of previous) {
    byTime.set(Number(candle.time), candle);
  }

  for (const candle of incoming) {
    const time = Number(candle.time);
    const old = byTime.get(time);

    byTime.set(time, {
      ...old,
      ...candle,
      datetime: candle.datetime ?? old?.datetime,
      ema9: candle.ema9 ?? old?.ema9 ?? null,
      ema21: candle.ema21 ?? old?.ema21 ?? null,
      ema50: candle.ema50 ?? old?.ema50 ?? null,
      rsi: candle.rsi ?? old?.rsi ?? null,
      atr: candle.atr ?? old?.atr ?? null,
    });
  }

  return [...byTime.values()]
    .sort((a, b) => Number(a.time) - Number(b.time))
    .slice(-limit);
}

export default function GoldCandlestickChart() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  const containerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ema9Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema21Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const candlesRef = useRef<Candle[]>([]);
  const limitRef = useRef(500);
  const intervalRef = useRef("5min");

  const [interval, setIntervalValue] = useState("5min");
  const [limit, setLimit] = useState("5000");

  const [showEMA9, setShowEMA9] = useState(true);
  const [showEMA21, setShowEMA21] = useState(true);
  const [showEMA50, setShowEMA50] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [candleCountdown, setCandleCountdown] = useState("03:14");
  const [lotSize, setLotSize] = useState("0.01");
  const [orderStatus, setOrderStatus] = useState<{
    type: "success" | "error" | "loading" | null;
    message: string;
  }>({ type: null, message: "" });
  const [isOrdering, setIsOrdering] = useState(false);
  const [openPositions, setOpenPositions] = useState<{
    ticket: number;
    symbol: string;
    type: "BUY" | "SELL";
    volume: number;
    price_open: number;
    price_current: number;
    profit: number;
    time: number;
  }[]>([]);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/trades/positions?symbol=XAUUSD`);
      if (res.ok) {
        const data = await res.json();
        setOpenPositions(data.positions || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const [isMarketClosed, setIsMarketClosed] = useState(false);
  const [marketClosedReason, setMarketClosedReason] = useState("");

  const checkMarketStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/market/status`);
      if (res.ok) {
        const data = await res.json();
        setIsMarketClosed(Boolean(data.is_market_closed));
        setMarketClosedReason(data.reason || "");
      }
    } catch {
      const day = new Date().getUTCDay();
      const isWknd = day === 0 || day === 6;
      setIsMarketClosed(isWknd);
      setMarketClosedReason(isWknd ? "Weekend market closure (Saturday & Sunday)" : "");
    }
  }, []);

  useEffect(() => {
    checkMarketStatus();
    const timer = setInterval(checkMarketStatus, 15000);
    return () => clearInterval(timer);
  }, [checkMarketStatus]);

  useEffect(() => {
    fetchPositions();
    const timer = setInterval(fetchPositions, 2000);
    return () => clearInterval(timer);
  }, [fetchPositions]);

  type ActiveSetup = {
    direction: "BUY" | "SELL" | string;
    entry_price: number;
    stop_loss: number;
    take_profit: number;
    sl: number;
    tp: number;
    tp1?: number | null;
    tp2?: number | null;
    tp3?: number | null;
    status?: string;
    reason?: string;
  };

  const [activeSetup, setActiveSetup] = useState<ActiveSetup | null>(null);
  const [showSetupLines, setShowSetupLines] = useState(true);
  const [showDrawingTools, setShowDrawingTools] = useState(true);
  const [drawingManager, setDrawingManager] = useState<DrawingManager | null>(null);

  const entryLineRef = useRef<any>(null);
  const slLineRef = useRef<any>(null);
  const tpLineRef = useRef<any>(null);
  const tp1LineRef = useRef<any>(null);
  const tp2LineRef = useRef<any>(null);
  const tp3LineRef = useRef<any>(null);

  const fetchActiveSetup = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/trades/active`);
      if (res.ok) {
        const data = await res.json();
        // If inactive, FLAT, or no position and setup, clear immediately
        if (!data.active || data.status === "FLAT" || (!data.position && !data.setup)) {
          setActiveSetup(null);
          return;
        }

        const active = data.position || data.setup;
        if (
          active &&
          active.status !== "CLOSED_SL" &&
          active.status !== "CLOSED_TP" &&
          active.status !== "CLOSED" &&
          (active.entry_price || active.stop_loss || active.sl)
        ) {
          setActiveSetup({
            direction: active.direction,
            entry_price: Number(active.entry_price),
            stop_loss: Number(active.stop_loss || active.sl),
            take_profit: Number(active.take_profit || active.tp),
            sl: Number(active.sl || active.stop_loss),
            tp: Number(active.tp || active.take_profit),
            tp1: active.tp1 != null ? Number(active.tp1) : (data.setup?.tp1 != null ? Number(data.setup.tp1) : undefined),
            tp2: active.tp2 != null ? Number(active.tp2) : (data.setup?.tp2 != null ? Number(data.setup.tp2) : (active.take_profit || active.tp ? Number(active.take_profit || active.tp) : undefined)),
            tp3: active.tp3 != null ? Number(active.tp3) : (data.setup?.tp3 != null ? Number(data.setup.tp3) : undefined),
            status: active.status || "OPEN",
            reason: active.reason || active.entry_reason || "",
          });
        } else {
          setActiveSetup(null);
        }
      } else {
        setActiveSetup(null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchActiveSetup();
    const timer = setInterval(fetchActiveSetup, 3000);
    return () => clearInterval(timer);
  }, [fetchActiveSetup]);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [symbol, setSymbol] = useState("XAU/USD");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);
  const [socketStatus, setSocketStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const previousCandleCountRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const secondsLeft = 300 - ((now.getMinutes() * 60 + now.getSeconds()) % 300);
      const mins = Math.floor(secondsLeft / 60);
      const secs = secondsLeft % 60;
      setCandleCountdown(
        `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    limitRef.current = Number(limit);
  }, [limit]);

  useEffect(() => {
    intervalRef.current = interval;
  }, [interval]);

  // ---------------------------------------------------------
  // 1. Load historical candles through REST API
  // ---------------------------------------------------------
  const fetchCandles = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          interval,
          limit,
        });

        const response = await fetch(`${API_URL}?${params}`, {
          cache: "no-store",
          signal,
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const result: ApiResponse = await response.json();

        if (!result.success || !Array.isArray(result.candles)) {
          throw new Error(
            result.message || result.detail || "Invalid API response"
          );
        }

        const normalized = result.candles
          .map((c) => normalizeCandle(c))
          .filter((c): c is Candle => c !== null);

        // Fallback calculation for RSI if not populated by backend
        const hasRsi = normalized.some(
          (c) => c.rsi != null && Number.isFinite(c.rsi)
        );
        if (!hasRsi && normalized.length > 14) {
          const calcRsi = calculateRSI(normalized, 14);
          const rsiMap = new Map(calcRsi.map((r) => [Number(r.time), r.value]));
          for (const c of normalized) {
            const val = rsiMap.get(Number(c.time));
            if (val !== undefined) c.rsi = Number(val.toFixed(2));
          }
        }

        const data = mergeCandles([], normalized, Number(limit));

        candlesRef.current = data;
        setCandles(data);
        setSymbol(result.symbol || "XAU/USD");

        setCurrentPrice(
          typeof result.current_price === "number"
            ? result.current_price
            : data.length
              ? data[data.length - 1].close
              : null
        );

        setUpdatedAt(new Date().toLocaleTimeString());
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Could not load historical candles"
        );
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [interval, limit]
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchCandles(controller.signal);
    return () => controller.abort();
  }, [fetchCandles, refreshKey]);

  // ---------------------------------------------------------
  // 2. Connect WebSocket for true live tick and candle updates
  // ---------------------------------------------------------
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let reconnectAttempts = 0;

    const connect = () => {
      if (stopped) return;

      setSocketStatus("connecting");

      try {
        const params = new URLSearchParams({ interval });
        socket = new WebSocket(`${WS_URL}?${params.toString()}`);
      } catch {
        setSocketStatus("disconnected");
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        reconnectAttempts = 0;
        setSocketStatus("connected");
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          const message: LiveMessage = JSON.parse(event.data);

          // Handle discrete candles if sent
          const rawItems: Partial<Candle>[] = [];
          if (Array.isArray(message.candles)) {
            rawItems.push(...message.candles);
          } else if (Array.isArray(message.data)) {
            rawItems.push(...message.data);
          } else if (message.candle) {
            rawItems.push(message.candle);
          }

          if (rawItems.length > 0) {
            const incoming = rawItems
              .map((raw) => normalizeCandle(raw))
              .filter((c): c is Candle => c !== null);

            if (incoming.length > 0) {
              setCandles((prev) =>
                mergeCandles(prev, incoming, limitRef.current)
              );
              const latestIncoming = incoming[incoming.length - 1];
              setCurrentPrice(latestIncoming.close);
              setUpdatedAt(new Date().toLocaleTimeString());
              return;
            }
          }

          // Handle live price tick (streams every second)
          const price = Number(message.price ?? message.current_price);
          if (!Number.isFinite(price) || price <= 0) return;

          setCurrentPrice(price);
          setUpdatedAt(new Date().toLocaleTimeString());

          const currentCandles = candlesRef.current;
          if (!currentCandles.length) return;

          const rawTime = Number(message.time ?? message.timestamp);
          const tickTime = Number.isFinite(rawTime)
            ? Math.floor(rawTime > 1e12 ? rawTime / 1000 : rawTime)
            : Math.floor(Date.now() / 1000);

          const seconds = INTERVAL_SECONDS[intervalRef.current] || 300;
          const candleTime = (Math.floor(tickTime / seconds) *
            seconds) as UTCTimestamp;

          const last = currentCandles[currentCandles.length - 1];
          const lastTime = Number(last.time);

          if (candleTime < lastTime) return;

          let updatedBar: Candle;
          let updatedList: Candle[];

          if (candleTime === lastTime) {
            // Update current active candle
            updatedBar = {
              ...last,
              high: Math.max(last.high, price),
              low: Math.min(last.low, price),
              close: price,
            };
            updatedList = [...currentCandles.slice(0, -1), updatedBar];
          } else {
            // Start a new candle
            updatedBar = {
              time: candleTime,
              open: price,
              high: price,
              low: price,
              close: price,
            };
            updatedList = [...currentCandles, updatedBar].slice(
              -limitRef.current
            );
          }

          // Real-time calculation of indicators for the live bar
          const prevBar =
            updatedList.length > 1
              ? updatedList[updatedList.length - 2]
              : null;

          const calcEMA = (
            prevEma: number | null | undefined,
            period: number
          ) => {
            if (prevEma == null || !Number.isFinite(prevEma)) return price;
            const k = 2 / (period + 1);
            return Number((price * k + prevEma * (1 - k)).toFixed(3));
          };

          updatedBar.ema9 = calcEMA(prevBar?.ema9, 9);
          updatedBar.ema21 = calcEMA(prevBar?.ema21, 21);
          updatedBar.ema50 = calcEMA(prevBar?.ema50, 50);

          const rsiCalc = calculateRSI(updatedList, 14);
          if (rsiCalc.length > 0) {
            updatedBar.rsi = Number(
              rsiCalc[rsiCalc.length - 1].value.toFixed(2)
            );
          }

          candlesRef.current = updatedList;
          setCandles(updatedList);

          // Direct series updates for zero-lag chart rendering
          candleSeriesRef.current?.update({
            time: updatedBar.time,
            open: updatedBar.open,
            high: updatedBar.high,
            low: updatedBar.low,
            close: updatedBar.close,
          });

          if (updatedBar.ema9 != null) {
            ema9Ref.current?.update({
              time: updatedBar.time,
              value: updatedBar.ema9,
            });
          }
          if (updatedBar.ema21 != null) {
            ema21Ref.current?.update({
              time: updatedBar.time,
              value: updatedBar.ema21,
            });
          }
          if (updatedBar.ema50 != null) {
            ema50Ref.current?.update({
              time: updatedBar.time,
              value: updatedBar.ema50,
            });
          }
          if (updatedBar.rsi != null) {
            rsiSeriesRef.current?.update({
              time: updatedBar.time,
              value: updatedBar.rsi,
            });
          }
        } catch (err) {
          console.error("Invalid WebSocket message:", err);
        }
      };

      socket.onerror = () => {
        setSocketStatus("disconnected");
      };

      socket.onclose = () => {
        setSocketStatus("disconnected");
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (stopped) return;
      if (reconnectTimer) clearTimeout(reconnectTimer);

      const delay = Math.min(
        1000 * 2 ** reconnectAttempts,
        MAX_RECONNECT_DELAY
      );
      reconnectAttempts += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);

      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;

        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close();
        }
      }
    };
  }, [interval]);

  // ---------------------------------------------------------
  // 3. Create RSI chart (Above Candlesticks)
  // ---------------------------------------------------------
  useEffect(() => {
    const element = rsiContainerRef.current;
    if (!element) return;

    const getContainerWidth = () => {
      const parentWidth = element.parentElement ? Math.floor(element.parentElement.clientWidth) : 0;
      const elementWidth = Math.floor(element.clientWidth);
      const rectWidth = element.parentElement
        ? Math.floor(element.parentElement.getBoundingClientRect().width)
        : Math.floor(element.getBoundingClientRect().width);

      const measured = Math.max(parentWidth, elementWidth, rectWidth);
      if (measured > 100) return measured;

      if (typeof window !== "undefined") {
        const sidebarWidth = window.innerWidth <= 760 ? 64 : window.innerWidth <= 1250 ? 210 : 245;
        const padding = window.innerWidth <= 760 ? 28 : window.innerWidth <= 1250 ? 40 : 48;
        const calculated = window.innerWidth - sidebarWidth - padding;
        if (calculated > 100) return Math.floor(calculated);
        return Math.floor(window.innerWidth);
      }
      return 1200;
    };

    const initialWidth = getContainerWidth();
    const isThemeLight = document.documentElement.getAttribute("data-theme") === "light";

    const chart = createChart(element, {
      width: initialWidth > 0 ? initialWidth : 1200,
      height: 135,
      layout: {
        background: {
          type: ColorType.Solid,
          color: isThemeLight ? "#ffffff" : "#131722",
        },
        textColor: isThemeLight ? "#475569" : "#787b86",
      },
      grid: {
        vertLines: { color: isThemeLight ? "#f1f5f9" : "#1e222d" },
        horzLines: { color: isThemeLight ? "#f1f5f9" : "#1e222d" },
      },
      rightPriceScale: {
        borderColor: isThemeLight ? "#e2e8f0" : "#2a2e39",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: isThemeLight ? "#e2e8f0" : "#2a2e39",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(LineSeries, {
      color: "#a78bfa",
      lineWidth: 2,
      title: "RSI 14",
      priceLineVisible: false,
      lastValueVisible: true,
    });

    series.createPriceLine({
      price: 70,
      color: "#f23645",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "Overbought (70)",
    });

    series.createPriceLine({
      price: 50,
      color: "#4a5260",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "50",
    });

    series.createPriceLine({
      price: 30,
      color: "#089981",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: "Oversold (30)",
    });

    rsiChartRef.current = chart;
    rsiSeriesRef.current = series;

    const handleResize = () => {
      if (!element || !chart) return;
      const targetWidth = getContainerWidth();
      if (targetWidth > 0) {
        chart.applyOptions({ width: targetWidth });
      }
    };

    const observer = new ResizeObserver(() => {
      handleResize();
    });

    observer.observe(element);
    if (element.parentElement) {
      observer.observe(element.parentElement);
    }
    if (typeof document !== "undefined" && document.body) {
      observer.observe(document.body);
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("popstate", handleResize);
    window.addEventListener("pageshow", handleResize);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleResize();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const rafId = requestAnimationFrame(handleResize);
    const t1 = setTimeout(handleResize, 50);
    const t2 = setTimeout(handleResize, 150);
    const t3 = setTimeout(handleResize, 350);
    const t4 = setTimeout(handleResize, 700);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("popstate", handleResize);
      window.removeEventListener("pageshow", handleResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      chart.remove();
      rsiChartRef.current = null;
      rsiSeriesRef.current = null;
    };
  }, []);

  // ---------------------------------------------------------
  // 4. Create Candlestick chart (Below RSI)
  // ---------------------------------------------------------
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const getContainerWidth = () => {
      const parentWidth = element.parentElement ? Math.floor(element.parentElement.clientWidth) : 0;
      const elementWidth = Math.floor(element.clientWidth);
      const rectWidth = element.parentElement
        ? Math.floor(element.parentElement.getBoundingClientRect().width)
        : Math.floor(element.getBoundingClientRect().width);

      const measured = Math.max(parentWidth, elementWidth, rectWidth);
      if (measured > 100) return measured;

      if (typeof window !== "undefined") {
        const sidebarWidth = window.innerWidth <= 760 ? 64 : window.innerWidth <= 1250 ? 210 : 245;
        const padding = window.innerWidth <= 760 ? 28 : window.innerWidth <= 1250 ? 40 : 48;
        const calculated = window.innerWidth - sidebarWidth - padding;
        if (calculated > 100) return Math.floor(calculated);
        return Math.floor(window.innerWidth);
      }
      return 1200;
    };

    const initialWidth = getContainerWidth();
    const isThemeLight = document.documentElement.getAttribute("data-theme") === "light";

    const chart = createChart(element, {
      width: initialWidth > 0 ? initialWidth : 1200,
      height: 480,
      layout: {
        background: {
          type: ColorType.Solid,
          color: isThemeLight ? "#ffffff" : "#131722",
        },
        textColor: isThemeLight ? "#475569" : "#787b86",
      },
      grid: {
        vertLines: { color: isThemeLight ? "#f1f5f9" : "#1e222d" },
        horzLines: { color: isThemeLight ? "#f1f5f9" : "#1e222d" },
      },
      rightPriceScale: {
        borderColor: isThemeLight ? "#e2e8f0" : "#2a2e39",
      },
      timeScale: {
        borderColor: isThemeLight ? "#e2e8f0" : "#2a2e39",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: isThemeLight ? "#94a3b8" : "#758696", width: 1, style: 2 },
        horzLine: { color: isThemeLight ? "#94a3b8" : "#758696", width: 1, style: 2 },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#089981",
      downColor: "#f23645",
      borderUpColor: "#089981",
      borderDownColor: "#f23645",
      wickUpColor: "#089981",
      wickDownColor: "#f23645",
    });

    const ema9 = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      title: "EMA 9",
      priceLineVisible: false,
    });

    const ema21 = chart.addSeries(LineSeries, {
      color: "#38bdf8",
      lineWidth: 2,
      title: "EMA 21",
      priceLineVisible: false,
    });

    const ema50 = chart.addSeries(LineSeries, {
      color: "#c084fc",
      lineWidth: 2,
      title: "EMA 50",
      priceLineVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    ema9Ref.current = ema9;
    ema21Ref.current = ema21;
    ema50Ref.current = ema50;

    // Initialize lightweight-charts-drawing DrawingManager
    let dm: DrawingManager | null = null;
    try {
      dm = new DrawingManager(chart, candleSeries, {
        magnet: "weak",
      });

      // Restore saved drawings if present in localStorage
      try {
        const saved = localStorage.getItem("gold_chart_drawings");
        if (saved) {
          dm.importJSON(saved);
        }
      } catch {
        // ignore
      }

      // Auto-save drawings to localStorage on change
      dm.on("change", () => {
        try {
          const json = dm?.exportJSON();
          if (json) {
            localStorage.setItem("gold_chart_drawings", json);
          }
        } catch {
          // ignore
        }
      });

      setDrawingManager(dm);
    } catch (err) {
      console.warn("Failed to initialize DrawingManager:", err);
    }

    // Two-way logical range synchronization between RSI and Candlestick charts
    let isSyncing = false;
    const timeScaleMain = chart.timeScale();

    const checkAndSync = () => {
      if (!rsiChartRef.current) return;
      const timeScaleRSI = rsiChartRef.current.timeScale();

      const syncMainToRSI = (
        range: ReturnType<typeof timeScaleMain.getVisibleLogicalRange>
      ) => {
        if (isSyncing || !range) return;
        isSyncing = true;
        timeScaleRSI.setVisibleLogicalRange(range);
        isSyncing = false;
      };

      const syncRSIToMain = (
        range: ReturnType<typeof timeScaleRSI.getVisibleLogicalRange>
      ) => {
        if (isSyncing || !range) return;
        isSyncing = true;
        timeScaleMain.setVisibleLogicalRange(range);
        isSyncing = false;
      };

      timeScaleMain.subscribeVisibleLogicalRangeChange(syncMainToRSI);
      timeScaleRSI.subscribeVisibleLogicalRangeChange(syncRSIToMain);
    };

    checkAndSync();

    const handleResize = () => {
      if (!element || !chart) return;
      const targetWidth = getContainerWidth();
      if (targetWidth > 0) {
        chart.applyOptions({ width: targetWidth });
      }
    };

    const observer = new ResizeObserver(() => {
      handleResize();
    });

    observer.observe(element);
    if (element.parentElement) {
      observer.observe(element.parentElement);
    }
    if (typeof document !== "undefined" && document.body) {
      observer.observe(document.body);
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("popstate", handleResize);
    window.addEventListener("pageshow", handleResize);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleResize();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const rafId = requestAnimationFrame(handleResize);
    const t1 = setTimeout(handleResize, 50);
    const t2 = setTimeout(handleResize, 150);
    const t3 = setTimeout(handleResize, 350);
    const t4 = setTimeout(handleResize, 700);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("popstate", handleResize);
      window.removeEventListener("pageshow", handleResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (dm) {
        try {
          dm.destroy();
        } catch {
          // ignore
        }
      }
      setDrawingManager(null);

      chart.remove();

      chartRef.current = null;
      candleSeriesRef.current = null;
      ema9Ref.current = null;
      ema21Ref.current = null;
      ema50Ref.current = null;
    };
  }, []);

  // ---------------------------------------------------------
  // 4b. Dynamic Light / Dark mode re-theming for charts
  // ---------------------------------------------------------
  useEffect(() => {
    const isLightMode = theme === "light";
    const bg = isLightMode ? "#ffffff" : "#131722";
    const gridColor = isLightMode ? "#f1f5f9" : "#1e222d";
    const borderColor = isLightMode ? "#e2e8f0" : "#2a2e39";
    const textColor = isLightMode ? "#475569" : "#787b86";

    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: {
          background: {
            type: ColorType.Solid,
            color: bg,
          },
          textColor,
        },
        grid: {
          vertLines: { color: gridColor },
          horzLines: { color: gridColor },
        },
        rightPriceScale: {
          borderColor,
        },
        timeScale: {
          borderColor,
        },
        crosshair: {
          vertLine: { color: isLightMode ? "#94a3b8" : "#758696", width: 1, style: 2 },
          horzLine: { color: isLightMode ? "#94a3b8" : "#758696", width: 1, style: 2 },
        },
      });
    }

    if (rsiChartRef.current) {
      rsiChartRef.current.applyOptions({
        layout: {
          background: {
            type: ColorType.Solid,
            color: bg,
          },
          textColor,
        },
        grid: {
          vertLines: { color: gridColor },
          horzLines: { color: gridColor },
        },
        rightPriceScale: {
          borderColor,
        },
        timeScale: {
          borderColor,
        },
      });
    }
  }, [theme]);

  // ---------------------------------------------------------
  // 5. Update chart series when historical candle data changes
  // ---------------------------------------------------------
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    const ohlcData: CandlestickData<UTCTimestamp>[] = candles.map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeriesRef.current.setData(ohlcData);

    const setEMA = (
      series: ISeriesApi<"Line"> | null,
      key: "ema9" | "ema21" | "ema50",
      visible: boolean
    ) => {
      if (!series) return;
      const data: LineData<UTCTimestamp>[] = visible
        ? candles
          .filter((c) => c[key] != null && Number.isFinite(c[key]))
          .map((c) => ({
            time: c.time,
            value: c[key] as number,
          }))
        : [];
      series.setData(data);
    };

    setEMA(ema9Ref.current, "ema9", showEMA9);
    setEMA(ema21Ref.current, "ema21", showEMA21);
    setEMA(ema50Ref.current, "ema50", showEMA50);

    const rsiData: LineData<UTCTimestamp>[] = candles
      .filter(
        (c) =>
          c.rsi != null &&
          Number.isFinite(c.rsi) &&
          c.rsi >= 0 &&
          c.rsi <= 100
      )
      .map((c) => ({
        time: c.time,
        value: c.rsi as number,
      }));

    rsiSeriesRef.current?.setData(rsiData);

    if (candles.length > 0) {
      if (previousCandleCountRef.current === 0) {
        chartRef.current?.timeScale().fitContent();
        rsiChartRef.current?.timeScale().fitContent();
      }
      previousCandleCountRef.current = candles.length;
    }
  }, [candles, showEMA9, showEMA21, showEMA50]);

  // ---------------------------------------------------------
  // 6. Draw / Update Confirmed Entry, SL, and TP Price Lines
  // ---------------------------------------------------------
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    // Safely remove existing setup price lines
    if (entryLineRef.current) {
      try { series.removePriceLine(entryLineRef.current); } catch { }
      entryLineRef.current = null;
    }
    if (slLineRef.current) {
      try { series.removePriceLine(slLineRef.current); } catch { }
      slLineRef.current = null;
    }
    if (tpLineRef.current) {
      try { series.removePriceLine(tpLineRef.current); } catch { }
      tpLineRef.current = null;
    }
    if (tp1LineRef.current) {
      try { series.removePriceLine(tp1LineRef.current); } catch { }
      tp1LineRef.current = null;
    }
    if (tp2LineRef.current) {
      try { series.removePriceLine(tp2LineRef.current); } catch { }
      tp2LineRef.current = null;
    }
    if (tp3LineRef.current) {
      try { series.removePriceLine(tp3LineRef.current); } catch { }
      tp3LineRef.current = null;
    }

    if (!showSetupLines || !activeSetup) return;

    const { direction, entry_price, sl, tp, stop_loss, take_profit, tp1, tp2, tp3 } = activeSetup;
    const finalSl = sl || stop_loss;
    const finalTp = tp || take_profit;
    const isBuy = direction?.toUpperCase() === "BUY";

    // 1. ENTRY Price Line (Solid Line)
    if (entry_price && Number.isFinite(entry_price)) {
      entryLineRef.current = series.createPriceLine({
        price: entry_price,
        color: isBuy ? "#089981" : "#f23645",
        lineWidth: 2,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
        title: `🎯 ENTRY (${direction}) ${entry_price.toFixed(2)}`,
      });
    }

    // 2. STOP LOSS (SL) Price Line (Dashed Red Line)
    if (finalSl && Number.isFinite(finalSl)) {
      slLineRef.current = series.createPriceLine({
        price: finalSl,
        color: "#f23645",
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `🛡️ SL ${finalSl.toFixed(2)}`,
      });
    }

    // 3. TAKE PROFIT (TP1, TP2, TP3) Price Lines (Dashed Green/Emerald Lines)
    const hasMultiTp = (tp1 && Number.isFinite(tp1)) || (tp2 && Number.isFinite(tp2)) || (tp3 && Number.isFinite(tp3));

    if (tp1 && Number.isFinite(tp1)) {
      tp1LineRef.current = series.createPriceLine({
        price: tp1,
        color: "#34d399",
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `🏆 TP1 ${tp1.toFixed(2)}`,
      });
    }

    if (tp2 && Number.isFinite(tp2)) {
      tp2LineRef.current = series.createPriceLine({
        price: tp2,
        color: "#059669",
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `🏆 TP2 ${tp2.toFixed(2)}`,
      });
    }

    if (tp3 && Number.isFinite(tp3)) {
      tp3LineRef.current = series.createPriceLine({
        price: tp3,
        color: "#10b981",
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `🏆 TP3 ${tp3.toFixed(2)}`,
      });
    }

    // Fallback if individual TP1/TP2/TP3 levels aren't available
    if (!hasMultiTp && finalTp && Number.isFinite(finalTp)) {
      tpLineRef.current = series.createPriceLine({
        price: finalTp,
        color: "#089981",
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `🏆 TP ${finalTp.toFixed(2)}`,
      });
    }
  }, [activeSetup, showSetupLines, candles]);

  const latest = candles.length ? candles[candles.length - 1] : null;
  const previous = candles.length > 1 ? candles[candles.length - 2] : latest;
  const price = currentPrice ?? (latest?.close ?? 0);
  const change = latest && previous ? price - previous.close : 0;
  const changePercent =
    previous && previous.close > 0 ? (change / previous.close) * 100 : 0;
  const bullish = latest ? latest.close >= latest.open : true;

  const rsiColor =
    latest?.rsi != null && latest.rsi >= 70
      ? "text-rose-400"
      : latest?.rsi != null && latest.rsi <= 30
        ? "text-emerald-400"
        : "text-violet-400";
  const handleOrder = async (side: "BUY" | "SELL") => {
    if (isMarketClosed) {
      setOrderStatus({
        type: "error",
        message: "Market is closed on weekends (Saturday & Sunday). Orders cannot be placed.",
      });
      setTimeout(() => {
        setOrderStatus((prev) => (prev.type === "error" ? { type: null, message: "" } : prev));
      }, 5000);
      return;
    }
    const executedPrice = price || latest?.close || 0;
    const parsedLotSize = parseFloat(lotSize) || 0.01;
    setIsOrdering(true);
    setOrderStatus({
      type: "loading",
      message: `Executing ${side} ${parsedLotSize} lot(s) @ ${formatPrice(executedPrice)}...`,
    });

    console.log(`[Order Initiated] ${side} ${parsedLotSize} lot(s) ${symbol} @ ${executedPrice}`);

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/trades/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: side,
          volume: parsedLotSize,
          symbol: "XAUUSD",
          price: executedPrice,
          comment: "GoldPilot Web",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const errorMsg = data.detail || data.error || `Failed to execute order (${res.status})`;
        console.error(`[Order Failed]`, errorMsg);
        setOrderStatus({ type: "error", message: errorMsg });
      } else {
        const dealId = data.deal || data.order;
        const successMsg = `Filled ${data.action} ${data.volume} @ ${formatPrice(data.price)} (Ticket #${dealId})`;
        console.log(`[Order Success]`, data);
        setOrderStatus({ type: "success", message: successMsg });
        fetchPositions();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Network error contacting trading backend";
      console.error(`[Order Error]`, errMsg);
      setOrderStatus({ type: "error", message: errMsg });
    } finally {
      setIsOrdering(false);
      setTimeout(() => {
        setOrderStatus((prev) => (prev.type !== "loading" ? { type: null, message: "" } : prev));
      }, 7000);
    }
  };

  const handleClosePosition = async (ticket?: number, closeSide?: "BUY" | "SELL") => {
    setIsOrdering(true);
    const targetLabel = ticket
      ? `position #${ticket}`
      : closeSide
        ? `${closeSide} positions`
        : `all ${symbol} positions`;

    setOrderStatus({
      type: "loading",
      message: `Closing ${targetLabel} in MT5...`,
    });

    console.log(`[Close Position Initiated] Closing ${targetLabel} in MT5`);

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/trades/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket: ticket ?? null,
          symbol: "XAUUSD",
          side: closeSide ?? null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const errorMsg = data.detail || data.error || data.message || `Failed to close position (${res.status})`;
        console.error(`[Close Position Failed]`, errorMsg);
        setOrderStatus({ type: "error", message: errorMsg });
      } else {
        const successMsg = `Closed ${data.closed_count} position(s) in MT5`;
        console.log(`[Close Position Success]`, data);
        setOrderStatus({ type: "success", message: successMsg });
        setActiveSetup(null);
        fetchPositions();
        fetchActiveSetup();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Network error contacting trading backend";
      console.error(`[Close Position Error]`, errMsg);
      setOrderStatus({ type: "error", message: errMsg });
    } finally {
      setIsOrdering(false);
      setTimeout(() => {
        setOrderStatus((prev) => (prev.type !== "loading" ? { type: null, message: "" } : prev));
      }, 7000);
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-(--card-border) bg-(--card-bg) text-(--card-text) shadow-2xl flex flex-col w-full min-w-0 max-w-full select-none">
      {/* 1. TRADINGVIEW TOP BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--card-border) bg-(--card-bg) px-3 py-2 text-xs">
        {/* Left: Symbol & Real-Time Price */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <h2 className="text-sm font-bold text-(--text) tracking-tight">{symbol}</h2>
            <span className="rounded bg-(--pill-bg) border border-(--card-border) px-1.5 py-0.5 text-[10px] text-amber-500 font-semibold">
              GOLD SPOT
            </span>
          </div>

          <div className="h-4 w-px bg-(--card-border)" />

          {/* Real-time Price Ticker */}
          <div className="flex items-center gap-2 font-mono">
            <span className="text-base font-bold text-(--text)">
              {formatPrice(currentPrice)}
            </span>
            <span
              className={`text-[11px] font-semibold ${change >= 0 ? "text-[#089981]" : "text-[#f23645]"
                }`}
            >
              {change >= 0 ? "+" : ""}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Center: Timeframe Pills & Candle Limit */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-(--pill-bg) border border-(--card-border) p-0.5">
            {TIMEFRAMES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  previousCandleCountRef.current = 0;
                  setIntervalValue(value);
                }}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${interval === value
                  ? "bg-[#2962ff] text-white"
                  : "text-(--muted) hover:bg-(--panel-hover) hover:text-(--text)"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          <select
            value={limit}
            onChange={(e) => {
              previousCandleCountRef.current = 0;
              setLimit(e.target.value);
            }}
            className="rounded-lg border border-(--card-border) bg-(--pill-bg) px-2 py-1 text-xs text-(--card-text) outline-none cursor-pointer"
          >

            <option value="5000">5000 bars</option>
            <option value="2500">2500 bars</option>
            <option value="1000">1000 bars</option>
            <option value="500">500 bars</option>
            <option value="200">200 bars</option>
            <option value="100">100 bars</option>
          </select>
        </div>

        {/* Right: Indicator Pills & WebSocket Status */}
        <div className="flex items-center gap-2">
          {/* Indicator toggles as TradingView style pills */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowEMA9((v) => !v)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${showEMA9
                ? "bg-amber-400/15 border-amber-400/40 text-amber-500 font-bold"
                : "bg-(--pill-bg) border-(--card-border) text-(--muted)"
                }`}
            >
              EMA 9
            </button>
            <button
              type="button"
              onClick={() => setShowEMA21((v) => !v)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${showEMA21
                ? "bg-sky-400/15 border-sky-400/40 text-sky-500 font-bold"
                : "bg-(--pill-bg) border-(--card-border) text-(--muted)"
                }`}
            >
              EMA 21
            </button>
            <button
              type="button"
              onClick={() => setShowEMA50((v) => !v)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${showEMA50
                ? "bg-purple-400/15 border-purple-400/40 text-purple-500 font-bold"
                : "bg-(--pill-bg) border-(--card-border) text-(--muted)"
                }`}
            >
              EMA 50
            </button>
            <button
              type="button"
              onClick={() => setShowRSI((v) => !v)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${showRSI
                ? "bg-violet-400/15 border-violet-400/40 text-violet-500 font-bold"
                : "bg-(--pill-bg) border-(--card-border) text-(--muted)"
                }`}
            >
              RSI 14
            </button>
            <button
              type="button"
              onClick={() => setShowSetupLines((v) => !v)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors inline-flex items-center gap-1.5 ${showSetupLines && activeSetup
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500 shadow-sm shadow-emerald-500/20"
                : "bg-(--pill-bg) border-(--card-border) text-(--muted)"
                }`}
              title="Toggle Confirmed Entry, SL, and TP horizontal price lines on chart"
            >
              <Target size={12} />
              Setup Lines (Entry/SL/TP)
            </button>
            <button
              type="button"
              onClick={() => setShowDrawingTools((v) => !v)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors inline-flex items-center gap-1.5 ${showDrawingTools
                ? "bg-[#2962ff]/20 border-[#2962ff]/50 text-[#93c5fd] font-bold shadow-sm shadow-[#2962ff]/20"
                : "bg-(--pill-bg) border-(--card-border) text-(--muted)"
                }`}
              title="Toggle TradingView Drawing Tools (Lines, Brush, Fibonacci, Forecasting)"
            >
              <Brush size={12} className={showDrawingTools ? "text-amber-400" : ""} />
              Drawing Tools
            </button>
          </div>

          <div className="h-4 w-px bg-(--card-border)" />

          {/* Connection Status */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium">
            <span
              className={`w-2 h-2 rounded-full ${socketStatus === "connected"
                ? "bg-[#089981] shadow-[0_0_8px_#089981]"
                : socketStatus === "connecting"
                  ? "bg-amber-400"
                  : "bg-[#f23645]"
                }`}
            />
            <span
              className={
                socketStatus === "connected"
                  ? "text-[#089981]"
                  : socketStatus === "connecting"
                    ? "text-amber-500"
                    : "text-[#f23645]"
              }
            >
              {socketStatus === "connected"
                ? "Live"
                : socketStatus === "connecting"
                  ? "Connecting"
                  : "Offline"}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            title="Refresh Data"
            onClick={() => {
              previousCandleCountRef.current = 0;
              setRefreshKey((v) => v + 1);
            }}
            disabled={loading}
            className="flex h-7 w-7 items-center justify-center rounded bg-(--pill-bg) border border-(--card-border) text-(--muted) hover:text-(--text) transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>

          {/* Theme Quick Toggle Button */}
          <button
            type="button"
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            onClick={toggleTheme}
            className="flex items-center gap-1 px-2 h-7 rounded bg-(--pill-bg) border border-(--card-border) text-[11px] font-semibold text-(--muted) hover:text-(--text) transition-colors cursor-pointer"
          >
            {theme === "dark" ? (
              <>
                <Sun size={13} className="text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon size={13} className="text-blue-600" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Weekend Market Closed Banner */}
      {isMarketClosed && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <div>
              <strong className="text-white font-semibold">Weekend Market Closure (Saturday & Sunday):</strong>
              <span className="ml-1 text-amber-200/90">{marketClosedReason || "Gold market is closed. All positions are closed and technical analysis is suspended."}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold whitespace-nowrap">
            MARKET CLOSED
          </span>
        </div>
      )}

      {/* 2. MAIN TRADINGVIEW CHART CANVAS */}
      <div className="flex flex-1 flex-col relative overflow-hidden bg-(--card-bg) min-h-125">
        {/* Floating Legend: OHLC Readout */}
        <div className="absolute top-2 left-4 z-20 flex flex-col gap-1 text-[11px] pointer-events-auto">
          <div className="flex items-center gap-3 font-mono text-[11px] text-[#787b86]">
            <span>
              O <strong className="text-[#d1d4dc]">{formatPrice(latest?.open)}</strong>
            </span>
            <span>
              H <strong className="text-[#089981]">{formatPrice(latest?.high)}</strong>
            </span>
            <span>
              L <strong className="text-[#f23645]">{formatPrice(latest?.low)}</strong>
            </span>
            <span>
              C{" "}
              <strong className={bullish ? "text-[#089981]" : "text-[#f23645]"}>
                {formatPrice(latest?.close)}
              </strong>
            </span>
            <span className="text-[#787b86] text-[10px]">
              {latest?.datetime || ""}
            </span>
          </div>
        </div>

        {/* Background Watermark */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
          <span className="text-[100px] font-black tracking-tighter text-white leading-none">
            {symbol}
          </span>
          <span className="text-[32px] font-bold text-white tracking-widest uppercase">
            {interval} · GOLD SPOT
          </span>
        </div>


        <div className="flex justify-end p-2">
          <div className="flex items-center gap-2">
            {orderStatus.type && (
              <span
                className={`text-[11px] px-2.5 py-1 rounded border font-medium ${orderStatus.type === "success"
                  ? "bg-[#089981]/15 border-[#089981]/40 text-[#089981]"
                  : orderStatus.type === "error"
                    ? "bg-[#f23645]/15 border-[#f23645]/40 text-[#f23645]"
                    : "bg-[#1e222d] border-[#2a2e39] text-amber-400"
                  }`}
              >
                {orderStatus.message}
              </span>
            )}
            <div className="flex items-center gap-1.5 rounded bg-[#1e222d] border border-[#2a2e39] px-2.5 py-1.5">
              <label htmlFor="lotSize" className="text-xs font-semibold text-[#787b86]">
                Lot:
              </label>
              <input
                id="lotSize"
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                disabled={isOrdering}
                className="w-16 bg-transparent text-right font-mono text-xs font-bold text-white outline-none disabled:opacity-50"
                placeholder="0.01"
              />
            </div>
            <button
              type="button"
              disabled={isOrdering}
              onClick={() => handleOrder("BUY")}
              className="bg-[#089981] hover:bg-[#07806c] active:scale-95 disabled:opacity-50 text-white px-4 py-2 rounded font-semibold text-xs cursor-pointer transition-all flex items-center gap-1.5 shadow-lg shadow-[#089981]/20"
            >
              {isOrdering ? <RefreshCw size={12} className="animate-spin" /> : null}
              Buy
            </button>
            <button
              type="button"
              disabled={isOrdering}
              onClick={() => handleOrder("SELL")}
              className="bg-[#f23645] hover:bg-[#d82a38] active:scale-95 disabled:opacity-50 text-white px-4 py-2 rounded font-semibold text-xs cursor-pointer transition-all flex items-center gap-1.5 shadow-lg shadow-[#f23645]/20"
            >
              {isOrdering ? <RefreshCw size={12} className="animate-spin" /> : null}
              Sell
            </button>
            <button
              type="button"
              disabled={isOrdering}
              onClick={() => handleClosePosition()}
              className="bg-[#2a2e39] hover:bg-[#363c4e] active:scale-95 disabled:opacity-50 text-[#d1d4dc] hover:text-white border border-[#363c4e] px-3.5 py-2 rounded font-semibold text-xs cursor-pointer transition-all flex items-center gap-1.5"
              title="Close all open XAUUSD positions in MetaTrader 5"
            >
              {isOrdering ? <RefreshCw size={12} className="animate-spin" /> : null}
              Close All {openPositions.length > 0 ? `(${openPositions.length})` : ""}
            </button>
          </div>
        </div>

        {/* Active Open Positions Bar */}
        {openPositions.length > 0 && (
          <div className="w-full border-b border-(--card-border) bg-(--panel) px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-(--text)">Open MT5 Positions ({openPositions.length}):</span>
              <span className="text-(--muted) text-[11px]">
                Net P/L:{" "}
                <span
                  className={`font-mono font-bold ${openPositions.reduce((acc, p) => acc + (p.profit || 0), 0) >= 0
                    ? "text-[#089981]"
                    : "text-[#f23645]"
                    }`}
                >
                  {openPositions.reduce((acc, p) => acc + (p.profit || 0), 0) >= 0 ? "+" : ""}$
                  {openPositions.reduce((acc, p) => acc + (p.profit || 0), 0).toFixed(2)}
                </span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {openPositions.map((pos) => (
                <div
                  key={pos.ticket}
                  className="flex items-center gap-2 rounded bg-(--pill-bg) border border-(--card-border) px-2.5 py-1 text-[11px]"
                >
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${pos.type === "BUY"
                      ? "bg-[#089981]/20 text-[#089981] border border-[#089981]/40"
                      : "bg-[#f23645]/20 text-[#f23645] border border-[#f23645]/40"
                      }`}
                  >
                    {pos.type} {pos.volume}
                  </span>
                  <span className="font-mono text-(--muted)">#{pos.ticket}</span>
                  <span className="font-mono text-(--card-text)">@{pos.price_open.toFixed(2)}</span>
                  <span
                    className={`font-mono font-semibold ${pos.profit >= 0 ? "text-[#089981]" : "text-[#f23645]"
                      }`}
                  >
                    {pos.profit >= 0 ? `+$${pos.profit.toFixed(2)}` : `-$${Math.abs(pos.profit).toFixed(2)}`}
                  </span>
                  <button
                    type="button"
                    disabled={isOrdering}
                    onClick={() => handleClosePosition(pos.ticket)}
                    className="ml-1 px-2 py-0.5 rounded bg-[#f23645]/20 hover:bg-[#f23645] text-[#f23645] hover:text-white transition-all text-[11px] font-semibold cursor-pointer border border-[#f23645]/30 active:scale-95"
                    title={`Close position #${pos.ticket}`}
                  >
                    Close
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={isOrdering}
                onClick={() => handleClosePosition()}
                className="px-2.5 py-1 rounded bg-(--pill-bg) hover:bg-(--panel-hover) text-xs font-semibold text-(--card-text) transition-all cursor-pointer border border-(--card-border) active:scale-95"
              >
                Close All
              </button>
            </div>
          </div>
        )}

        {/* RSI Sub-pane (Collapsible) */}
        {showRSI && (
          <div className="w-full border-b border-(--card-border) bg-(--card-bg) relative shrink-0 min-w-0 max-w-full overflow-hidden">
            <div className="flex items-center justify-between text-[11px] px-3 pt-2 pb-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#a78bfa]">RSI 14</span>
                <span className="text-(--muted)">Close</span>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-(--muted)">Overbought 70 · Mid 50 · Oversold 30</span>
                <span className={`font-mono font-bold text-xs ${rsiColor}`}>
                  {latest?.rsi != null ? latest.rsi.toFixed(2) : "—"}
                </span>
              </div>
            </div>
            <div ref={rsiContainerRef} className="w-full h-32.5 min-w-0 max-w-full overflow-hidden" />
          </div>
        )}

        {/* Main Candlestick Chart Canvas */}
        <div className="relative flex-1 w-full min-w-0 max-w-full min-h-120">
          {/* Confirmed Trade Setup Floating Pill (Top-Left overlay, offset for toolbar) */}
          {activeSetup && (
            <div className="absolute top-3 left-14 z-20 flex flex-wrap items-center gap-2 rounded-lg bg-(--card-bg)/95 border border-(--card-border) p-1.5 backdrop-blur-md shadow-2xl text-xs select-none">
              {/* Direction & Status Tag */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-(--pill-bg) border border-(--card-border)">
                <span className={`w-2 h-2 rounded-full animate-pulse ${activeSetup.direction === "BUY" ? "bg-[#089981]" : "bg-[#f23645]"}`} />
                {activeSetup.direction === "BUY" ? (
                  <TrendingUp className="w-3.5 h-3.5 text-[#089981]" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-[#f23645]" />
                )}
                <span className={`font-bold uppercase tracking-wider text-[11px] ${activeSetup.direction === "BUY" ? "text-[#089981]" : "text-[#f23645]"}`}>
                  CONFIRMED {activeSetup.direction} SETUP
                </span>
              </div>

              {/* Entry Tag with Target Icon */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#2962ff]/10 border border-[#2962ff]/30 text-[11px]">
                <Target className="w-3.5 h-3.5 text-[#2962ff]" />
                <span className="text-[#93c5fd] font-semibold text-[10px] uppercase tracking-wide">Entry:</span>
                <span className="font-mono font-bold text-(--text)">
                  {activeSetup.entry_price ? activeSetup.entry_price.toFixed(2) : "—"}
                </span>
              </div>

              {/* Stop Loss (SL) Tag with ShieldAlert Icon */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#f23645]/10 border border-[#f23645]/30 text-[11px]">
                <ShieldAlert className="w-3.5 h-3.5 text-[#f23645]" />
                <span className="text-[#fca5a5] font-semibold text-[10px] uppercase tracking-wide">SL:</span>
                <span className="font-mono font-bold text-[#f23645]">
                  {activeSetup.sl ? activeSetup.sl.toFixed(2) : "—"}
                </span>
              </div>

              {/* Take Profit (TP1, TP2, TP3) Tags with Trophy Icons */}
              {activeSetup.tp1 != null ? (
                <>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#089981]/10 border border-[#089981]/30 text-[11px]">
                    <Trophy className="w-3.5 h-3.5 text-[#34d399]" />
                    <span className="text-[#34d399] font-semibold text-[10px] uppercase tracking-wide">TP 1:</span>
                    <span className="font-mono font-bold text-[#34d399]">
                      {activeSetup.tp1.toFixed(2)}
                    </span>
                  </div>
                  {activeSetup.tp2 != null && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#089981]/15 border border-[#089981]/40 text-[11px]">
                      <Trophy className="w-3.5 h-3.5 text-[#089981]" />
                      <span className="text-[#86efac] font-semibold text-[10px] uppercase tracking-wide">TP 2:</span>
                      <span className="font-mono font-bold text-[#089981]">
                        {activeSetup.tp2.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {activeSetup.tp3 != null && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#089981]/20 border border-[#089981]/50 text-[11px]">
                      <Trophy className="w-3.5 h-3.5 text-[#10b981]" />
                      <span className="text-[#a7f3d0] font-semibold text-[10px] uppercase tracking-wide">TP 3:</span>
                      <span className="font-mono font-bold text-[#10b981]">
                        {activeSetup.tp3.toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#089981]/10 border border-[#089981]/30 text-[11px]">
                  <Trophy className="w-3.5 h-3.5 text-[#089981]" />
                  <span className="text-[#86efac] font-semibold text-[10px] uppercase tracking-wide">TP:</span>
                  <span className="font-mono font-bold text-[#089981]">
                    {activeSetup.tp ? activeSetup.tp.toFixed(2) : "—"}
                  </span>
                </div>
              )}

              {/* PnL Points Diff */}
              {currentPrice != null && activeSetup.entry_price && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-(--pill-bg) border border-(--card-border) text-[11px]">
                  <span className="text-(--muted) text-[10px] uppercase tracking-wide">Diff:</span>
                  <span
                    className={`font-mono font-bold ${(activeSetup.direction === "BUY" ? currentPrice - activeSetup.entry_price : activeSetup.entry_price - currentPrice) >= 0
                      ? "text-[#089981]"
                      : "text-[#f23645]"
                      }`}
                  >
                    {activeSetup.direction === "BUY"
                      ? (currentPrice - activeSetup.entry_price >= 0 ? "+" : "") + (currentPrice - activeSetup.entry_price).toFixed(2)
                      : (activeSetup.entry_price - currentPrice >= 0 ? "+" : "") + (activeSetup.entry_price - currentPrice).toFixed(2)} pts
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowSetupLines(!showSetupLines)}
                className="px-2 py-1 text-[10px] text-(--muted) hover:text-(--text) hover:underline cursor-pointer"
                title="Toggle Entry, SL, and TP horizontal lines on the candlestick chart"
              >
                {showSetupLines ? "Hide lines" : "Show lines"}
              </button>
            </div>
          )}

          {loading && candles.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-(--card-bg)/80 backdrop-blur-sm text-xs text-(--muted)">
              <RefreshCw className="mr-2 animate-spin text-[#2962ff]" size={16} />
              Loading {symbol} historical candles...
            </div>
          )}

          <div ref={containerRef} className="w-full h-full min-h-115 min-w-0 max-w-full overflow-hidden" />

          {/* Interactive TradingView Drawing Tools Layer (powered by lightweight-charts-drawing) */}
          {showDrawingTools && (
            <ChartDrawingLayer
              chartRef={chartRef}
              seriesRef={candleSeriesRef}
              candles={candles}
              drawingManager={drawingManager}
            />
          )}

          {/* Candle Countdown Pill */}
          <div className="absolute bottom-2 right-20 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded bg-(--pill-bg) border border-(--card-border) text-[10px] font-mono text-(--muted)">
            <Clock size={11} className="text-amber-400" />
            <span>Bar Close:</span>
            <strong className="text-amber-400">{candleCountdown}</strong>
          </div>
        </div>
      </div>

      {/* 3. TRADINGVIEW BOTTOM STATUS STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--card-border) bg-(--card-bg) px-4 py-2 text-xs text-(--muted)">
        <div className="flex items-center gap-4">
          <span>
            ATR: <strong className="text-amber-500 font-mono">{formatPrice(latest?.atr)}</strong>
          </span>
          <span>
            EMA 9: <strong className="text-amber-500 font-mono">{formatPrice(latest?.ema9)}</strong>
          </span>
          <span>
            EMA 21: <strong className="text-sky-500 font-mono">{formatPrice(latest?.ema21)}</strong>
          </span>
          <span>
            EMA 50: <strong className="text-purple-500 font-mono">{formatPrice(latest?.ema50)}</strong>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>{candles.length} candles</span>
          <span>{updatedAt ? `Updated ${updatedAt}` : "Waiting for live data"}</span>
        </div>
      </div>
    </section>
  );
}
