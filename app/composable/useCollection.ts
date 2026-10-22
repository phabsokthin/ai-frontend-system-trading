"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "../../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type QueryConstraint,
  type UpdateData,
} from "firebase/firestore";

/* =====================================================================
 *  COLLECTION NAMES & ENUMS
 * ===================================================================== */
export const COLLECTIONS = {
  TRADES: "trades",
  SIGNALS: "signals",
  ANALYSIS: "analysis",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS] | string;

/* =====================================================================
 *  TYPE DEFINITIONS
 * ===================================================================== */

export interface TradeDocument extends DocumentData {
  id?: string;
  ticket?: number | string;
  symbol?: string;
  direction?: "BUY" | "SELL" | string;
  action?: "BUY" | "SELL" | string;
  entry_price?: number;
  exit_price?: number;
  stop_loss?: number;
  take_profit?: number;
  sl?: number;
  tp?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  volume?: number;
  status?: "OPEN" | "CLOSED" | "CLOSED_TP" | "CLOSED_SL" | "MANUALLY_CLOSED" | string;
  pnl_points?: number;
  final_pnl_points?: number;
  profit?: number;
  reason?: string;
  exit_reason?: string;
  entry_time?: string;
  exit_time?: string;
  timeframe?: string;
  source?: "ai_signal" | "manual_web" | "mt5_sync" | string;
  comment?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface SignalDocument extends DocumentData {
  id?: string;
  setup_id?: string;
  analysis_id?: string;
  timestamp_utc?: string;
  symbol?: string;
  signal?: "BUY" | "SELL" | "WAIT" | string;
  action?: string;
  price?: number;
  stop_loss?: number;
  take_profit?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  confidence?: string;
  reason?: string;
  is_new_entry?: boolean;
  timeframe?: string;
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
  createdAt?: any;
}

export interface AnalysisDocument extends DocumentData {
  id?: string;
  timestamp_utc?: string;
  symbol?: string;
  price?: number;
  current_price?: number;
  signal?: string;
  action?: string;
  trade_status?: string;
  reason?: string;
  stop_loss?: number;
  take_profit?: number;
  sl?: number;
  tp?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  is_new_entry?: boolean;
  multi_timeframe?: {
    analysis_timeframe?: string;
    htf_trend?: string;
    htf_rsi?: number;
    entry_timeframe?: string;
    entry_signal?: string;
    ltf_signal?: string;
    timeframe_aligned?: boolean;
  };
  technical_indicators?: {
    rsi14?: number;
    ema9?: number;
    ema21?: number;
    ema50?: number;
    ema200?: number;
    atr14?: number;
    adx14?: number;
    macd?: {
      macd?: number;
      signal?: number;
      hist?: number;
    };
    [key: string]: any;
  };
  support_resistance?: {
    current_price?: number;
    pivot_point?: number;
    nearest_support?: number;
    nearest_resistance?: number;
    zone?: string;
    [key: string]: any;
  };
  news_filter?: {
    allowed?: boolean;
    reason?: string;
    news_analysis?: any;
    [key: string]: any;
  };
  ai_analysis?: {
    ai_bias?: string;
    ai_confidence?: number | string;
    model_agreement?: boolean;
    reasoning?: string;
    [key: string]: any;
  };
  risk_levels?: any;
  trading_mode?: string;
  createdAt?: any;
}

/* =====================================================================
 *  BASE HOOK: useCollection (Generic CRUD + Query)
 * ===================================================================== */

export const useCollection = <T extends DocumentData = DocumentData>(collectionName: CollectionName) => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const collectionRef = collection(db, collectionName);

  // Add document with an auto-generated ID (aliased for compatibility)
  const addcDocs = async (formDoc: T): Promise<DocumentReference | undefined> => {
    setIsPending(true);
    setError(null);

    try {
      const docWithMeta = {
        ...formDoc,
        createdAt: formDoc.createdAt || serverTimestamp(),
      };
      return await addDoc(collectionRef, docWithMeta);
    } catch (err: any) {
      console.error(`Error adding document to ${collectionName}:`, err);
      setError(err?.message || "Failed to add document");
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  // Alias for addcDocs with standard naming
  const addDocument = addcDocs;

  // Set document with a specific ID (or upsert)
  const setDocs = async (formDoc: T, id: string, merge: boolean = true): Promise<boolean> => {
    setIsPending(true);
    setError(null);

    try {
      const docWithMeta = {
        ...formDoc,
        updatedAt: serverTimestamp(),
        createdAt: formDoc.createdAt || serverTimestamp(),
      };
      await setDoc(doc(collectionRef, id), docWithMeta, { merge });
      return true;
    } catch (err: any) {
      console.error(`Error setting document in ${collectionName}:`, err);
      setError(err?.message || "Failed to set document");
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  // Update an existing document
  const updateDocs = async (id: string, formDoc: UpdateData<T>): Promise<boolean> => {
    setIsPending(true);
    setError(null);

    try {
      const updateWithMeta = {
        ...formDoc,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(collectionRef, id), updateWithMeta as UpdateData<DocumentData>);
      return true;
    } catch (err: any) {
      console.error(`Error updating document in ${collectionName}:`, err);
      setError(err?.message || "Failed to update document");
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  // Delete document by ID
  const deleteDocs = async (docID: string): Promise<boolean> => {
    setIsPending(true);
    setError(null);

    try {
      await deleteDoc(doc(collectionRef, docID));
      return true;
    } catch (err: any) {
      console.error(`Error deleting document in ${collectionName}:`, err);
      setError(err?.message || "Failed to delete document");
      throw err;
    } finally {
      setIsPending(false);
    }
  };

  // Fetch documents once with optional query constraints
  const getDocuments = async (constraints: QueryConstraint[] = []): Promise<(T & { id: string })[]> => {
    setIsPending(true);
    setError(null);

    try {
      const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as T),
      }));
    } catch (err: any) {
      console.error(`Error getting documents from ${collectionName}:`, err);
      setError(err?.message || "Failed to fetch documents");
      return [];
    } finally {
      setIsPending(false);
    }
  };

  return {
    addcDocs,
    addDoc: addDocument,
    addDocument,
    setDocs,
    setDoc: setDocs,
    updateDocs,
    updateDoc: updateDocs,
    deleteDocs,
    deleteDoc: deleteDocs,
    getDocuments,
    isPending,
    error,
  };
};

/* =====================================================================
 *  SPECIALIZED HOOK: useTrades (Real-time Firestore listener & ops)
 * ===================================================================== */

export interface UseTradesOptions {
  realtime?: boolean;
  limitCount?: number;
  statusFilter?: string;
}

export const useTrades = (options: UseTradesOptions = {}) => {
  const { realtime = true, limitCount = 50, statusFilter } = options;

  const [trades, setTrades] = useState<TradeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { addDocument, setDocs, updateDocs, deleteDocs, isPending } =
    useCollection<TradeDocument>(COLLECTIONS.TRADES);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const constraints: QueryConstraint[] = [];
      if (statusFilter) {
        constraints.push(where("status", "==", statusFilter));
      }
      constraints.push(orderBy("createdAt", "desc"));
      if (limitCount > 0) {
        constraints.push(limit(limitCount));
      }

      const q = query(collection(db, COLLECTIONS.TRADES), ...constraints);
      const snapshot = await getDocs(q);
      const items: TradeDocument[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setTrades(items);
    } catch (err: any) {
      console.error("Error fetching trades:", err);
      setError(err?.message || "Failed to load trades");
    } finally {
      setLoading(false);
    }
  }, [limitCount, statusFilter]);

  useEffect(() => {
    if (!realtime) {
      fetchTrades();
      return;
    }

    setLoading(true);
    setError(null);

    const constraints: QueryConstraint[] = [];
    if (statusFilter) {
      constraints.push(where("status", "==", statusFilter));
    }
    constraints.push(orderBy("createdAt", "desc"));
    if (limitCount > 0) {
      constraints.push(limit(limitCount));
    }

    const q = query(collection(db, COLLECTIONS.TRADES), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: TradeDocument[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setTrades(items);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore onSnapshot error (trades):", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [realtime, limitCount, statusFilter, fetchTrades]);

  // Convenience helper to add a trade
  const addTrade = async (trade: TradeDocument) => {
    return await addDocument(trade);
  };

  // Upsert trade by ID (e.g. ticket ID or MT5 deal ID)
  const setTrade = async (id: string, trade: TradeDocument) => {
    return await setDocs(trade, id);
  };

  // Close an active trade in Firestore
  const closeTrade = async (
    id: string,
    exitPrice: number,
    status: "CLOSED_TP" | "CLOSED_SL" | "MANUALLY_CLOSED" | "CLOSED" = "CLOSED",
    exitReason?: string,
    pnlPoints?: number
  ) => {
    return await updateDocs(id, {
      status,
      exit_price: exitPrice,
      exit_reason: exitReason || `Closed as ${status}`,
      exit_time: new Date().toISOString(),
      ...(pnlPoints !== undefined ? { pnl_points: pnlPoints, final_pnl_points: pnlPoints } : {}),
    });
  };

  const activeTrades = trades.filter((t) => t.status === "OPEN");
  const closedTrades = trades.filter((t) => t.status !== "OPEN");

  return {
    trades,
    activeTrades,
    closedTrades,
    loading: loading || isPending,
    isPending,
    error,
    addTrade,
    setTrade,
    updateTrade: updateDocs,
    closeTrade,
    deleteTrade: deleteDocs,
    refresh: fetchTrades,
  };
};

/* =====================================================================
 *  SPECIALIZED HOOK: useSignals (Real-time Firestore listener & ops)
 * ===================================================================== */

export interface UseSignalsOptions {
  realtime?: boolean;
  limitCount?: number;
  collectionName?: "signals" | "Signals" | string;
}

export const useSignals = (options: UseSignalsOptions = {}) => {
  const { realtime = true, limitCount = 30, collectionName = COLLECTIONS.SIGNALS } = options;

  const [signals, setSignals] = useState<SignalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { addDocument, setDocs, updateDocs, deleteDocs, isPending } =
    useCollection<SignalDocument>(collectionName);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, collectionName),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const items: SignalDocument[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setSignals(items);
    } catch (err: any) {
      console.error("Error fetching signals:", err);
      setError(err?.message || "Failed to load signals");
    } finally {
      setLoading(false);
    }
  }, [collectionName, limitCount]);

  useEffect(() => {
    if (!realtime) {
      fetchSignals();
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, collectionName),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: SignalDocument[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setSignals(items);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore onSnapshot error (signals):", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [realtime, limitCount, collectionName, fetchSignals]);

  const latestSignal = signals.length > 0 ? signals[0] : null;

  return {
    signals,
    latestSignal,
    loading: loading || isPending,
    isPending,
    error,
    addSignal: addDocument,
    setSignal: (id: string, s: SignalDocument) => setDocs(s, id),
    updateSignal: updateDocs,
    deleteSignal: deleteDocs,
    refresh: fetchSignals,
  };
};

/* =====================================================================
 *  SPECIALIZED HOOK: useAnalysis (Real-time Firestore listener & ops)
 * ===================================================================== */

export interface UseAnalysisOptions {
  realtime?: boolean;
  limitCount?: number;
}

export const useAnalysis = (options: UseAnalysisOptions = {}) => {
  const { realtime = true, limitCount = 20 } = options;

  const [analysisList, setAnalysisList] = useState<AnalysisDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { addDocument, setDocs, updateDocs, deleteDocs, isPending } =
    useCollection<AnalysisDocument>(COLLECTIONS.ANALYSIS);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, COLLECTIONS.ANALYSIS),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const items: AnalysisDocument[] = [];
      const seenCandles = new Set<string>();

      for (const d of snapshot.docs) {
        if (d.id === "latest") continue;
        const data = d.data() as AnalysisDocument;
        const item: AnalysisDocument = { id: d.id, ...data };
        const ts = item.timestamp_utc || "";
        let candleKey = d.id;
        if (ts) {
          const t = new Date(ts).getTime();
          if (!isNaN(t)) {
            candleKey = `${Math.floor(t / (5 * 60 * 1000))}_${item.symbol || "XAU/USD"}`;
          }
        }
        if (!seenCandles.has(candleKey)) {
          seenCandles.add(candleKey);
          items.push(item);
        }
      }

      setAnalysisList(items);
    } catch (err: any) {
      console.error("Error fetching analysis records:", err);
      setError(err?.message || "Failed to load analysis");
    } finally {
      setLoading(false);
    }
  }, [limitCount]);

  useEffect(() => {
    if (!realtime) {
      fetchAnalysis();
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, COLLECTIONS.ANALYSIS),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: AnalysisDocument[] = [];
        const seenCandles = new Set<string>();

        for (const d of snapshot.docs) {
          if (d.id === "latest") continue;
          const data = d.data() as AnalysisDocument;
          const item: AnalysisDocument = { id: d.id, ...data };
          const ts = item.timestamp_utc || "";
          let candleKey = d.id;
          if (ts) {
            const t = new Date(ts).getTime();
            if (!isNaN(t)) {
              candleKey = `${Math.floor(t / (5 * 60 * 1000))}_${item.symbol || "XAU/USD"}`;
            }
          }
          if (!seenCandles.has(candleKey)) {
            seenCandles.add(candleKey);
            items.push(item);
          }
        }

        setAnalysisList(items);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore onSnapshot error (analysis):", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [realtime, limitCount, fetchAnalysis]);

  // Save/record a new analysis payload
  const saveAnalysis = async (data: AnalysisDocument, customId?: string) => {
    if (customId) {
      return await setDocs(data, customId);
    }
    return await addDocument(data);
  };

  const latestAnalysis = analysisList.length > 0 ? analysisList[0] : null;

  return {
    analysisList,
    latestAnalysis,
    loading: loading || isPending,
    isPending,
    error,
    saveAnalysis,
    updateAnalysis: updateDocs,
    deleteAnalysis: deleteDocs,
    refresh: fetchAnalysis,
  };
};

/* =====================================================================
 *  FIRESTORE DATA SANITIZER & BATCH SYNC UTILITIES
 * ===================================================================== */

/**
 * Remove undefined values and MongoDB specific fields (_id) so Firestore accepts the payload.
 * Preserves Date, FieldValue, and Timestamp objects.
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || typeof obj !== "object") return obj;

  if (
    obj instanceof Date ||
    obj.constructor?.name?.includes("FieldValue") ||
    obj.constructor?.name?.includes("Timestamp") ||
    "_methodName" in obj
  ) {
    return obj;
  }

  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === "_id") continue;
    if (val === undefined) continue;

    if (Array.isArray(val)) {
      result[key] = val
        .filter((item) => item !== undefined)
        .map((item) =>
          item !== null && typeof item === "object" && !(item instanceof Date)
            ? sanitizeForFirestore(item)
            : item
        );
    } else if (
      val !== null &&
      typeof val === "object" &&
      !(val instanceof Date) &&
      !("_methodName" in val) &&
      !val.constructor?.name?.includes("FieldValue") &&
      !val.constructor?.name?.includes("Timestamp")
    ) {
      result[key] = sanitizeForFirestore(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

// In-memory cache to prevent duplicate Firestore writes during periodic polling
const syncedTradesCache = new Map<string, string>();
const syncedSignalsCache = new Set<string>();
const syncedAnalysisCache = new Set<string>();
let lastSyncedAnalysisTimestamp: string | null = null;
let lastSyncedLatestSignature: string | null = null;

export function resetFirestoreSyncCache() {
  syncedTradesCache.clear();
  syncedSignalsCache.clear();
  syncedAnalysisCache.clear();
  lastSyncedAnalysisTimestamp = null;
  lastSyncedLatestSignature = null;
  console.log("[Firestore Sync] In-memory sync cache cleared.");
}

/**
 * Push a single trade directly to the 'trades' collection in Firestore.
 */
export async function pushTradeToFirestore(trade: Partial<TradeDocument>): Promise<boolean> {
  try {
    const rawId = String(
      trade.id ||
      (trade.ticket ? `trade_mt5_${trade.ticket}` : `trade_${trade.entry_time || Date.now()}`)
    );
    const tradeId = rawId.replace(/\//g, "_");
    const docRef = doc(db, COLLECTIONS.TRADES, tradeId);
    const clean = {
      ...sanitizeForFirestore(trade),
      id: tradeId,
      updatedAt: serverTimestamp(),
      createdAt: trade.createdAt || serverTimestamp(),
    };
    await setDoc(docRef, clean, { merge: true });
    return true;
  } catch (err) {
    console.error("Error pushing trade to Firestore:", err);
    return false;
  }
}

/**
 * Push a single signal directly to the 'signals' collection in Firestore.
 */
export async function pushSignalToFirestore(signal: Partial<SignalDocument>): Promise<boolean> {
  try {
    const rawId = String(
      signal.id ||
      signal.setup_id ||
      signal.analysis_id ||
      `signal_${(signal.timestamp_utc || new Date().toISOString()).replace(/[:.]/g, "_")}_${signal.signal || signal.action || "WAIT"}`
    );
    const sigId = rawId.replace(/\//g, "_");
    const docRef = doc(db, COLLECTIONS.SIGNALS, sigId);
    const clean = {
      ...sanitizeForFirestore(signal),
      id: sigId,
      updatedAt: serverTimestamp(),
      createdAt: signal.createdAt || serverTimestamp(),
    };
    await setDoc(docRef, clean, { merge: true });
    return true;
  } catch (err) {
    console.error("Error pushing signal to Firestore:", err);
    return false;
  }
}

/**
 * Push an analysis snapshot directly to the 'analysis' collection in Firestore.
 */
export async function pushAnalysisToFirestore(analysis: Partial<AnalysisDocument>, docId?: string): Promise<boolean> {
  try {
    const rawId = docId || String(
      analysis.id ||
      (analysis.timestamp_utc ? `analysis_${analysis.timestamp_utc.replace(/[:.]/g, "_")}` : "latest")
    );
    const id = rawId.replace(/\//g, "_");
    const docRef = doc(db, COLLECTIONS.ANALYSIS, id);
    const clean = {
      ...sanitizeForFirestore(analysis),
      id,
      updatedAt: serverTimestamp(),
      createdAt: analysis.createdAt || serverTimestamp(),
    };
    await setDoc(docRef, clean, { merge: true });
    return true;
  } catch (err) {
    console.error("Error pushing analysis to Firestore:", err);
    return false;
  }
}

export interface SyncApiDataPayload {
  activeTrade?: any;
  trades?: any[];
  signals?: any[];
  latestAnalysis?: any;
  analysisHistory?: any[];
  force?: boolean;
}

export interface SyncResult {
  success: boolean;
  tradesPushed: number;
  signalsPushed: number;
  analysisPushed: number;
  totalOps: number;
  error?: string;
}

/**
 * Push and synchronize all trade, signal, and analysis data fetched from backend APIs into Firestore.
 * Automatically deduplicates to avoid unnecessary writes and protect Firebase quota.
 */
export async function syncApiDataToFirestore(payload: SyncApiDataPayload): Promise<SyncResult> {
  let tradesPushed = 0;
  let signalsPushed = 0;
  let analysisPushed = 0;

  if (payload.force) {
    resetFirestoreSyncCache();
  }

  // Pending cache updates applied ONLY if batch.commit() succeeds
  const pendingTrades = new Map<string, string>();
  const pendingSignals = new Set<string>();
  const pendingAnalysis = new Set<string>();
  let pendingAnalysisTs: string | null = null;
  let pendingLatestSig: string | null = null;

  try {
    const batch = writeBatch(db);
    let opCount = 0;

    // 1. Sync Active Trade (if present)
    if (payload.activeTrade) {
      const t = payload.activeTrade;
      const rawId = String(t.id || (t.ticket ? `trade_mt5_${t.ticket}` : "active_trade"));
      const tradeId = rawId.replace(/\//g, "_");
      const sig = `OPEN_${t.entry_price || ""}_${t.current_price || ""}_${t.stop_loss || ""}_${t.take_profit || ""}`;

      if (syncedTradesCache.get(tradeId) !== sig) {
        const docRef = doc(db, COLLECTIONS.TRADES, tradeId);
        const clean = {
          ...sanitizeForFirestore(t),
          id: tradeId,
          status: "OPEN",
          updatedAt: serverTimestamp(),
          createdAt: t.createdAt || t.created_at || serverTimestamp(),
        };
        batch.set(docRef, clean, { merge: true });
        pendingTrades.set(tradeId, sig);
        opCount++;
        tradesPushed++;
      }
    }

    // 2. Sync Historical Trades
    if (Array.isArray(payload.trades)) {
      for (const t of payload.trades) {
        if (!t) continue;
        const rawId = String(
          t.id ||
          (t.ticket ? `trade_mt5_${t.ticket}` : `trade_${t.entry_time || t.created_at || Date.now()}`)
        );
        const tradeId = rawId.replace(/\//g, "_");
        const sig = `${t.status || ""}_${t.exit_price || ""}_${t.pnl_points ?? t.profit ?? ""}`;

        if (syncedTradesCache.get(tradeId) !== sig && opCount < 450) {
          const docRef = doc(db, COLLECTIONS.TRADES, tradeId);
          const clean = {
            ...sanitizeForFirestore(t),
            id: tradeId,
            updatedAt: serverTimestamp(),
            createdAt: t.createdAt || t.created_at || serverTimestamp(),
          };
          batch.set(docRef, clean, { merge: true });
          pendingTrades.set(tradeId, sig);
          opCount++;
          tradesPushed++;
        }
      }
    }

    // 3. Sync Signals with 100% Consistency to DB (prunes extras/duplicates in Firestore)
    if (Array.isArray(payload.signals)) {
      const validDbSignalIds = new Set<string>();
      const validDbSetupIds = new Set<string>();

      for (const s of payload.signals) {
        if (!s) continue;
        const sigId = String(
          s.setup_id ||
          s.id ||
          (s.timestamp_utc ? `signal_${s.timestamp_utc.replace(/[:.]/g, "_")}_${s.signal || "SETUP"}` : "") ||
          `signal_${Date.now()}`
        ).replace(/\//g, "_");

        validDbSignalIds.add(sigId);
        if (s.setup_id) validDbSetupIds.add(String(s.setup_id));

        if (!syncedSignalsCache.has(sigId) && opCount < 450) {
          const docRef = doc(db, COLLECTIONS.SIGNALS, sigId);
          const cleanSignal = {
            id: sigId,
            setup_id: s.setup_id || sigId,
            timestamp_utc: s.timestamp_utc || new Date().toISOString(),
            symbol: s.symbol || "XAU/USD",
            signal: s.signal,
            action: s.action || `OPEN_${s.signal}`,
            price: s.price,
            stop_loss: s.stop_loss || s.sl,
            take_profit: s.take_profit || s.tp,
            confidence: s.confidence || s.setup?.confidence || "HIGH",
            reason: s.reason,
            setup: s.setup,
            is_new_entry: true,
            updatedAt: serverTimestamp(),
            createdAt: s.createdAt || s.created_at || serverTimestamp(),
          };
          batch.set(docRef, sanitizeForFirestore(cleanSignal), { merge: true });
          pendingSignals.add(sigId);
          opCount++;
          signalsPushed++;
        }
      }

      // Query Firestore signals collection to prune any duplicates, stale, or deleted signals
      try {
        const firestoreSignalsSnap = await getDocs(query(collection(db, COLLECTIONS.SIGNALS), limit(50)));
        for (const fDoc of firestoreSignalsSnap.docs) {
          const fId = fDoc.id;
          const data = fDoc.data();
          const fSetupId = String(data.setup_id || data.id || "");

          // Check if document is an unknown signal or duplicate format
          const isExactDbMatch = validDbSignalIds.has(fId);
          const isDuplicateTimestampDoc = !isExactDbMatch && fSetupId && validDbSetupIds.has(fSetupId);
          const isDeletedFromDb = !isExactDbMatch && (!fSetupId || !validDbSetupIds.has(fSetupId));

          if ((isDuplicateTimestampDoc || isDeletedFromDb) && opCount < 450) {
            batch.delete(fDoc.ref);
            opCount++;
            console.log(`[Firestore Sync] Pruned inconsistent signal document from Firestore: ${fId}`);
          }
        }
      } catch (pruneErr) {
        console.warn("[Firestore Sync] Notice during signal pruning:", pruneErr);
      }
    } else if (payload.latestAnalysis) {
      // Fallback: If signals array was not provided, sync new entry if confirmed
      const latest = payload.latestAnalysis;
      const isNewEntry = Boolean(
        latest && (
          latest.is_new_entry === true ||
          latest.action === "OPEN_BUY" ||
          latest.action === "OPEN_SELL"
        ) &&
        latest.signal &&
        latest.signal !== "WAIT"
      );

      if (isNewEntry) {
        const activePos = latest.active_position || latest.setup || {};
        const rawId = String(
          activePos.setup_id ||
          activePos.id ||
          (latest.timestamp_utc ? `signal_${latest.timestamp_utc.replace(/[:.]/g, "_")}_${latest.signal}` : "") ||
          `signal_${Date.now()}_${latest.signal}`
        );
        const sigId = rawId.replace(/\//g, "_");

        if (!syncedSignalsCache.has(sigId) && opCount < 450) {
          const docRef = doc(db, COLLECTIONS.SIGNALS, sigId);
          const cleanSignal = {
            id: sigId,
            setup_id: activePos.setup_id || activePos.id || sigId,
            timestamp_utc: latest.timestamp_utc || new Date().toISOString(),
            symbol: latest.symbol || "XAU/USD",
            signal: latest.signal,
            action: latest.action || `OPEN_${latest.signal}`,
            price: latest.price,
            stop_loss: latest.stop_loss || latest.sl,
            take_profit: latest.take_profit || latest.tp,
            confidence: latest.setup?.confidence || "HIGH",
            reason: latest.reason,
            setup: latest.setup,
            is_new_entry: true,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          };
          batch.set(docRef, sanitizeForFirestore(cleanSignal), { merge: true });
          pendingSignals.add(sigId);
          opCount++;
          signalsPushed++;
        }
      }
    }

    // 4. Sync Latest Analysis (points to current market snapshot)
    if (payload.latestAnalysis) {
      const a = payload.latestAnalysis;
      const ts = a.timestamp_utc || new Date().toISOString();
      const priceVal = a.current_price !== undefined ? a.current_price : a.price;
      const reasonVal = a.reason || a.message || a.setup?.reasons?.[0] || "Analysis completed";

      // Always keep "latest" doc in sync with newest price & timestamp
      const latestSig = `${ts}_${priceVal}_${a.signal || a.action || ""}_${reasonVal}`;
      if ((lastSyncedLatestSignature !== latestSig || payload.force) && opCount < 450) {
        const latestDocRef = doc(db, COLLECTIONS.ANALYSIS, "latest");
        const cleanLatest = {
          ...sanitizeForFirestore(a),
          id: "latest",
          price: priceVal,
          current_price: priceVal,
          reason: reasonVal,
          updatedAt: serverTimestamp(),
          createdAt: a.createdAt || a.created_at || serverTimestamp(),
        };
        batch.set(latestDocRef, cleanLatest, { merge: true });
        pendingLatestSig = latestSig;
        opCount++;
        analysisPushed++;
      }

      // Compute canonical 5-minute candle identifier (e.g. analysis_2026-10-22T03_15)
      let candleKey = "";
      try {
        const d = new Date(ts);
        const candleMinutes = Math.floor(d.getUTCMinutes() / 5) * 5;
        candleKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}_${String(candleMinutes).padStart(2, "0")}`;
      } catch {
        candleKey = ts.replace(/[:.]/g, "_").slice(0, 16);
      }
      const histId = `analysis_${candleKey}`;

      if ((!syncedAnalysisCache.has(histId) || payload.force) && opCount < 450) {
        const histDocRef = doc(db, COLLECTIONS.ANALYSIS, histId);
        const cleanHist = {
          ...sanitizeForFirestore(a),
          id: histId,
          candle_key: candleKey,
          price: priceVal,
          current_price: priceVal,
          reason: reasonVal,
          updatedAt: serverTimestamp(),
          createdAt: a.createdAt || a.created_at || serverTimestamp(),
        };
        batch.set(histDocRef, cleanHist, { merge: true });
        pendingAnalysis.add(histId);
        opCount++;
        analysisPushed++;
      }
    }

    // 5. Sync Historical Analysis Snapshots (if provided in payload)
    if (Array.isArray(payload.analysisHistory)) {
      for (const item of payload.analysisHistory) {
        if (!item) continue;
        const ts = item.timestamp_utc || item.created_at;
        if (!ts) continue;

        let candleKey = "";
        try {
          const d = new Date(ts);
          const candleMinutes = Math.floor(d.getUTCMinutes() / 5) * 5;
          candleKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}_${String(candleMinutes).padStart(2, "0")}`;
        } catch {
          candleKey = String(ts).replace(/[:.]/g, "_").slice(0, 16);
        }
        const histId = `analysis_${candleKey}`;

        if ((!syncedAnalysisCache.has(histId) || payload.force) && opCount < 450) {
          const histDocRef = doc(db, COLLECTIONS.ANALYSIS, histId);
          const pVal = item.current_price !== undefined ? item.current_price : item.price;
          const rVal = item.reason || item.message || "Market analysis snapshot";
          const cleanHist = {
            ...sanitizeForFirestore(item),
            id: histId,
            candle_key: candleKey,
            price: pVal,
            current_price: pVal,
            reason: rVal,
            updatedAt: serverTimestamp(),
            createdAt: item.createdAt || item.created_at || serverTimestamp(),
          };
          batch.set(histDocRef, cleanHist, { merge: true });
          pendingAnalysis.add(histId);
          opCount++;
          analysisPushed++;
        }
      }
    }

    // Commit batch if there are new operations
    if (opCount > 0) {
      await batch.commit();
      console.log(
        `[Firestore Sync] Successfully committed ${opCount} writes (Trades: ${tradesPushed}, Signals: ${signalsPushed}, Analysis: ${analysisPushed})`
      );

      // Apply pending cache ONLY after successful commit
      for (const [k, v] of pendingTrades.entries()) syncedTradesCache.set(k, v);
      for (const k of pendingSignals) syncedSignalsCache.add(k);
      for (const k of pendingAnalysis) syncedAnalysisCache.add(k);
      if (pendingLatestSig) lastSyncedLatestSignature = pendingLatestSig;
    }

    return {
      success: true,
      tradesPushed,
      signalsPushed,
      analysisPushed,
      totalOps: opCount,
    };
  } catch (err: any) {
    console.error("[Firestore Sync Error]:", err);
    return {
      success: false,
      tradesPushed,
      signalsPushed,
      analysisPushed,
      totalOps: 0,
      error: err?.message || String(err),
    };
  }
}

export default useCollection;


