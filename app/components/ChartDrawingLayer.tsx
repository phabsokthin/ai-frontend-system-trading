"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MousePointer,
  Minus,
  TrendingUp,
  Percent,
  Brush,
  ArrowUpRight,
  ArrowDownRight,
  Ruler,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  GripVertical,
  X,
  Magnet,
  Maximize2,
  Square,
  Circle,
  Triangle,
  Highlighter,
  Sliders,
  ChevronRight,
  Type,
  MessageSquare,
  Pin,
  Tag,
  Flag,
  Waves,
  Activity,
  Calendar,
  Lock,
  Unlock,
  MoveHorizontal,
  MoveVertical,
  Crosshair,
  BarChart2,
  Spline,
} from "lucide-react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { DrawingManager, buildNewDrawing, type DrawingKind } from "lightweight-charts-drawing";

interface ChartDrawingLayerProps {
  chartRef: React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<ISeriesApi<"Candlestick"> | null>;
  candles?: { high: number; low: number; close: number; open: number; time: UTCTimestamp }[];
  drawingManager?: DrawingManager | null;
}

type ToolCategory = "lines" | "fib" | "brushes" | "shapes" | "text" | "patterns" | "forecast" | null;

interface ToolOption {
  kind: DrawingKind;
  label: string;
  desc?: string;
  icon: React.ReactNode;
}

export default function ChartDrawingLayer({
  chartRef,
  seriesRef,
  candles = [],
  drawingManager,
}: ChartDrawingLayerProps) {
  const [activeTool, setActiveTool] = useState<DrawingKind | null>(null);
  const [openCategory, setOpenCategory] = useState<ToolCategory>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [magnetMode, setMagnetMode] = useState<"weak" | "strong" | "off">("weak");
  const [stayInDrawingMode, setStayInDrawingMode] = useState<boolean>(false);
  const [drawingsVisible, setDrawingsVisible] = useState<boolean>(true);

  // Active slot tracking (TradingView remembers last used tool in each slot)
  const [lastLineTool, setLastLineTool] = useState<DrawingKind>("trend-line");
  const [lastFibTool, setLastFibTool] = useState<DrawingKind>("fib-retracement");
  const [lastBrushTool, setLastBrushTool] = useState<DrawingKind>("brush");
  const [lastShapeTool, setLastShapeTool] = useState<DrawingKind>("rectangle");
  const [lastTextTool, setLastTextTool] = useState<DrawingKind>("text");
  const [lastPatternTool, setLastPatternTool] = useState<DrawingKind>("head-and-shoulders");
  const [lastForecastTool, setLastForecastTool] = useState<DrawingKind>("long-position");

  // Movable toolbar state
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number }>({ x: 12, y: 56 });
  const [isDraggingToolbar, setIsDraggingToolbar] = useState<boolean>(false);
  const toolbarDragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 12,
    startY: 56,
  });

  // ---------------------------------------------------------------------------
  // Tool Definitions by Category (TradingView Structure)
  // ---------------------------------------------------------------------------
  const LINE_TOOLS: ToolOption[] = [
    { kind: "trend-line", label: "Trend Line", desc: "Two-point trendline", icon: <TrendingUp size={14} /> },
    { kind: "ray", label: "Ray", desc: "Origin with one-way infinite ray", icon: <TrendingUp size={14} /> },
    { kind: "info-line", label: "Info Line", desc: "Line with distance & slope", icon: <Activity size={14} /> },
    { kind: "extended-line", label: "Extended Line", desc: "Infinite two-way line", icon: <Maximize2 size={14} /> },
    { kind: "trend-angle", label: "Trend Angle", desc: "Trendline with exact angle", icon: <TrendingUp size={14} /> },
    { kind: "horizontal-line", label: "Horizontal Line", desc: "Support/Resistance across chart", icon: <Minus size={14} /> },
    { kind: "horizontal-ray", label: "Horizontal Ray", desc: "Level extending to the right", icon: <MoveHorizontal size={14} /> },
    { kind: "vertical-line", label: "Vertical Line", desc: "Time marker line", icon: <MoveVertical size={14} /> },
    { kind: "cross-line", label: "Cross Line", desc: "Simultaneous time and price level", icon: <Crosshair size={14} /> },
    { kind: "parallel-channel", label: "Parallel Channel", desc: "Ascending/descending channel", icon: <Square size={14} /> },
    { kind: "flat-top-bottom", label: "Flat Top/Bottom", desc: "Breakout triangle channel", icon: <Square size={14} /> },
    { kind: "disjoint-channel", label: "Disjoint Channel", desc: "Diverging channel bounds", icon: <Square size={14} /> },
    { kind: "regression-trend", label: "Regression Trend", desc: "Statistical linear regression", icon: <BarChart2 size={14} /> },
    { kind: "anchored-vwap", label: "Anchored VWAP", desc: "Volume-weighted average price", icon: <Activity size={14} /> },
  ];

  const FIB_TOOLS: ToolOption[] = [
    { kind: "fib-retracement", label: "Fib Retracement", desc: "Standard 7 Fibonacci levels", icon: <Percent size={14} /> },
    { kind: "trend-based-fib-extension", label: "Trend-Based Fib Extension", desc: "3-point expansion target", icon: <Percent size={14} /> },
    { kind: "fib-channel", label: "Fib Channel", desc: "Sloped Fibonacci parallel bands", icon: <Percent size={14} /> },
    { kind: "fib-time-zone", label: "Fib Time Zone", desc: "Cycle time projection bands", icon: <Calendar size={14} /> },
    { kind: "fib-speed-resistance-fan", label: "Fib Speed Resistance Fan", desc: "Angular resistance rays", icon: <Percent size={14} /> },
    { kind: "fib-circles", label: "Fib Circles", desc: "Concentric time-price circles", icon: <Circle size={14} /> },
    { kind: "fib-spiral", label: "Fib Spiral", desc: "Golden ratio logarithmic spiral", icon: <Spline size={14} /> },
    { kind: "fib-wedge", label: "Fib Wedge", desc: "Converging fibonacci rays", icon: <Triangle size={14} /> },
    { kind: "pitchfork", label: "Pitchfork (Andrews)", desc: "Median line with outer prongs", icon: <Activity size={14} /> },
    { kind: "schiff-pitchfork", label: "Schiff Pitchfork", desc: "Modified origin pitchfork", icon: <Activity size={14} /> },
    { kind: "modified-schiff-pitchfork", label: "Modified Schiff Pitchfork", desc: "Halfway vertical midpoint", icon: <Activity size={14} /> },
    { kind: "inside-pitchfork", label: "Inside Pitchfork", desc: "Internal median line", icon: <Activity size={14} /> },
    { kind: "gann-box", label: "Gann Box", desc: "Time and price square framework", icon: <Square size={14} /> },
    { kind: "gann-square", label: "Gann Square", desc: "Fixed 45-degree angle grid", icon: <Square size={14} /> },
    { kind: "gann-fan", label: "Gann Fan", desc: "1x1, 2x1, 1x2 harmonic angles", icon: <Percent size={14} /> },
  ];

  const BRUSH_TOOLS: ToolOption[] = [
    { kind: "brush", label: "Brush", desc: "Freehand smooth drawing", icon: <Brush size={14} /> },
    { kind: "highlighter", label: "Highlighter", desc: "Broad translucent marker", icon: <Highlighter size={14} /> },
    { kind: "arrow", label: "Arrow", desc: "Directional pointer arrow", icon: <ArrowUpRight size={14} /> },
    { kind: "polyline", label: "Polyline", desc: "Multi-segment connected path", icon: <Spline size={14} /> },
    { kind: "path", label: "Path", desc: "Continuous segmented track", icon: <Spline size={14} /> },
    { kind: "curve", label: "Curve", desc: "3-point smooth curved arc", icon: <Spline size={14} /> },
    { kind: "arc", label: "Arc", desc: "Radial circular arc", icon: <Spline size={14} /> },
    { kind: "double-curve", label: "Double Curve", desc: "S-shaped dual inflection curve", icon: <Spline size={14} /> },
  ];

  const SHAPE_TOOLS: ToolOption[] = [
    { kind: "rectangle", label: "Rectangle", desc: "Support/Resistance zone box", icon: <Square size={14} /> },
    { kind: "rotated-rectangle", label: "Rotated Rectangle", desc: "Sloped rectangular zone", icon: <Square size={14} /> },
    { kind: "circle", label: "Circle", desc: "Radial circular highlight", icon: <Circle size={14} /> },
    { kind: "ellipse", label: "Ellipse", desc: "Oval price-time zone", icon: <Circle size={14} /> },
    { kind: "triangle", label: "Triangle", desc: "3-point geometric wedge", icon: <Triangle size={14} /> },
  ];

  const TEXT_TOOLS: ToolOption[] = [
    { kind: "text", label: "Text", desc: "On-chart text note", icon: <Type size={14} /> },
    { kind: "callout", label: "Callout", desc: "Speech bubble with pointer", icon: <MessageSquare size={14} /> },
    { kind: "note", label: "Note", desc: "Sticky note marker", icon: <Tag size={14} /> },
    { kind: "price-label", label: "Price Label", desc: "Exact price tag badge", icon: <Tag size={14} /> },
    { kind: "price-note", label: "Price Note", desc: "Price tag with comment", icon: <Tag size={14} /> },
    { kind: "arrow-mark-up", label: "Arrow Mark Up", desc: "Bullish buy arrow tag", icon: <ArrowUpRight size={14} /> },
    { kind: "arrow-mark-down", label: "Arrow Mark Down", desc: "Bearish sell arrow tag", icon: <ArrowDownRight size={14} /> },
    { kind: "flag-mark", label: "Flag Mark", desc: "Key milestone flag", icon: <Flag size={14} /> },
    { kind: "signpost", label: "Signpost", desc: "Vertical marker with label", icon: <Pin size={14} /> },
    { kind: "comment", label: "Comment", desc: "Floating comment pill", icon: <MessageSquare size={14} /> },
  ];

  const PATTERN_TOOLS: ToolOption[] = [
    { kind: "head-and-shoulders", label: "Head and Shoulders", desc: "Reversal pattern with neckline", icon: <Waves size={14} /> },
    { kind: "xabcd-pattern", label: "XABCD Harmonic", desc: "Gartley, Bat, Butterfly, Crab", icon: <Waves size={14} /> },
    { kind: "cypher-pattern", label: "Cypher Pattern", desc: "Advanced harmonic setup", icon: <Waves size={14} /> },
    { kind: "abcd-pattern", label: "ABCD Pattern", desc: "Harmonic zigzag leg", icon: <Waves size={14} /> },
    { kind: "triangle-pattern", label: "Triangle Pattern", desc: "A-B-C-D-E consolidation", icon: <Triangle size={14} /> },
    { kind: "three-drives-pattern", label: "Three Drives Pattern", desc: "Symmetrical three-push move", icon: <Waves size={14} /> },
    { kind: "elliott-impulse", label: "Elliott Wave (12345)", desc: "5-wave impulse motive cycle", icon: <Waves size={14} /> },
    { kind: "elliott-correction", label: "Elliott Wave (ABC)", desc: "3-wave corrective cycle", icon: <Waves size={14} /> },
    { kind: "elliott-triangle", label: "Elliott Triangle (ABCDE)", desc: "Contracting / expanding wave", icon: <Waves size={14} /> },
    { kind: "elliott-double-combo", label: "Elliott Double Combo (WXY)", desc: "Complex dual correction", icon: <Waves size={14} /> },
    { kind: "elliott-triple-combo", label: "Elliott Triple Combo (WXYXZ)", desc: "Extended complex correction", icon: <Waves size={14} /> },
    { kind: "cyclic-lines", label: "Cyclic Lines", desc: "Regular recurring time cycles", icon: <Calendar size={14} /> },
    { kind: "time-cycles", label: "Time Cycles", desc: "Harmonic period arcs", icon: <Calendar size={14} /> },
    { kind: "sine-line", label: "Sine Line", desc: "Periodic oscillator wave", icon: <Spline size={14} /> },
  ];

  const FORECAST_TOOLS: ToolOption[] = [
    { kind: "long-position", label: "Long Position", desc: "Long R:R risk/reward projection box", icon: <ArrowUpRight size={14} className="text-emerald-400" /> },
    { kind: "short-position", label: "Short Position", desc: "Short R:R risk/reward projection box", icon: <ArrowDownRight size={14} className="text-red-400" /> },
    { kind: "position-forecast", label: "Forecast (Prediction)", desc: "Future trajectory path & target", icon: <TrendingUp size={14} /> },
    { kind: "price-range", label: "Price Range", desc: "Measure price delta & percentage", icon: <Ruler size={14} /> },
    { kind: "date-range", label: "Date Range", desc: "Measure bar count and elapsed time", icon: <Calendar size={14} /> },
    { kind: "date-and-price-range", label: "Date & Price Range", desc: "Simultaneous measurement box", icon: <Ruler size={14} /> },
    { kind: "bar-pattern", label: "Bars Pattern", desc: "Clone & project historic candle sequence", icon: <BarChart2 size={14} /> },
    { kind: "ghost-feed", label: "Ghost Feed", desc: "Project simulated future candles", icon: <BarChart2 size={14} /> },
    { kind: "fixed-range-volume-profile", label: "Fixed Range Volume Profile", desc: "Volume histogram by price level", icon: <BarChart2 size={14} /> },
    { kind: "anchored-volume-profile", label: "Anchored Volume Profile", desc: "Volume profile starting from chosen bar", icon: <BarChart2 size={14} /> },
  ];

  // ---------------------------------------------------------------------------
  // Sync with DrawingManager events
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!drawingManager) return;

    const unTool = drawingManager.on("tool", (tool: any) => {
      setActiveTool(tool);
    });

    const unSelection = drawingManager.on("selection", (ids: readonly string[]) => {
      setSelectedIds([...ids]);
    });

    const unVisibility = drawingManager.on("visibility", () => {
      setDrawingsVisible(drawingManager.drawingsVisible());
    });

    return () => {
      unTool();
      unSelection();
      unVisibility();
    };
  }, [drawingManager]);

  // Select tool handler
  const handleSelectTool = (kind: DrawingKind | null) => {
    if (!drawingManager) return;
    drawingManager.setTool(kind);
    setActiveTool(kind);
    setOpenCategory(null);

    // Update last used slot
    if (kind) {
      if (LINE_TOOLS.some((t) => t.kind === kind)) setLastLineTool(kind);
      if (FIB_TOOLS.some((t) => t.kind === kind)) setLastFibTool(kind);
      if (BRUSH_TOOLS.some((t) => t.kind === kind)) setLastBrushTool(kind);
      if (SHAPE_TOOLS.some((t) => t.kind === kind)) setLastShapeTool(kind);
      if (TEXT_TOOLS.some((t) => t.kind === kind)) setLastTextTool(kind);
      if (PATTERN_TOOLS.some((t) => t.kind === kind)) setLastPatternTool(kind);
      if (FORECAST_TOOLS.some((t) => t.kind === kind)) setLastForecastTool(kind);
    }
  };

  // Toggle category flyout menu
  const toggleCategory = (cat: ToolCategory) => {
    setOpenCategory((prev) => (prev === cat ? null : cat));
  };

  // Toggle magnet mode
  const handleToggleMagnet = () => {
    if (!drawingManager) return;
    const nextMode = magnetMode === "weak" ? "strong" : magnetMode === "strong" ? "off" : "weak";
    setMagnetMode(nextMode);
    drawingManager.setMagnet(nextMode === "off" ? "off" : nextMode);
  };

  // Toggle stay in drawing mode
  const handleToggleStayInMode = () => {
    if (!drawingManager) return;
    const next = !stayInDrawingMode;
    setStayInDrawingMode(next);
    drawingManager.setStayInDrawingMode(next);
  };

  // Toggle visibility of drawings
  const handleToggleVisibility = () => {
    if (!drawingManager) return;
    const nextVis = !drawingsVisible;
    setDrawingsVisible(nextVis);
    drawingManager.setDrawingsVisible(nextVis);
  };

  // Delete selected drawing
  const handleDeleteSelected = () => {
    if (!drawingManager || selectedIds.length === 0) return;
    for (const id of selectedIds) {
      drawingManager.remove(id);
    }
    setSelectedIds([]);
  };

  // Clear all drawings
  const handleClearAll = () => {
    if (!drawingManager) return;
    drawingManager.clear();
    setSelectedIds([]);
    try {
      localStorage.removeItem("gold_chart_drawings");
    } catch {
      // ignore
    }
  };

  // Auto-Fibonacci 1-click preset
  const handleAutoFibonacci = useCallback(() => {
    if (!drawingManager || !candles || candles.length < 10) return;
    const recent = candles.slice(-80);
    const highest = Math.max(...recent.map((c) => c.high));
    const lowest = Math.min(...recent.map((c) => c.low));

    const highCandle = recent.find((c) => c.high === highest);
    const lowCandle = recent.find((c) => c.low === lowest);

    if (!highCandle || !lowCandle) return;

    try {
      const fibDrawing = buildNewDrawing("fib-retracement", [
        { time: highCandle.time, price: highest },
        { time: lowCandle.time, price: lowest },
      ]);
      if (fibDrawing) {
        drawingManager.add(fibDrawing);
      }
    } catch (e) {
      console.warn("Auto-fib error:", e);
    }
  }, [candles, drawingManager]);

  // Toolbar drag handling
  const handleToolbarMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingToolbar(true);
    toolbarDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: toolbarPos.x,
      startY: toolbarPos.y,
    };
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isDraggingToolbar) return;
      const dx = e.clientX - toolbarDragStartRef.current.mouseX;
      const dy = e.clientY - toolbarDragStartRef.current.mouseY;
      setToolbarPos({
        x: Math.max(8, Math.min(window.innerWidth - 120, toolbarDragStartRef.current.startX + dx)),
        y: Math.max(10, Math.min(180, toolbarDragStartRef.current.startY + dy)),
      });
    };

    const handleWindowMouseUp = () => {
      setIsDraggingToolbar(false);
    };

    if (isDraggingToolbar) {
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isDraggingToolbar]);

  // Keyboard shortcut delete & escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          handleDeleteSelected();
        }
      }
      if (e.key === "Escape") {
        handleSelectTool(null);
        setOpenCategory(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, drawingManager]);

  // Close flyouts on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".drawing-toolbar-container")) {
        setOpenCategory(null);
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <>
      {/* 1. TRADINGVIEW-GRADE VERTICAL DRAWING TOOLBAR */}
      <div
        style={{ left: `${toolbarPos.x}px`, top: `${toolbarPos.y}px` }}
        className="drawing-toolbar-container absolute z-30 flex flex-col items-center gap-1 p-1 rounded-xl bg-[#131722]/95 border border-[#2a2e39] backdrop-blur-md shadow-2xl select-none text-xs"
      >
        {/* Grip Drag Handle */}
        <div
          onMouseDown={handleToolbarMouseDown}
          className="flex h-5 w-8 items-center justify-center cursor-move text-(--muted) hover:text-(--card-text) transition-colors"
          title="Drag to Move Toolbar anywhere on chart"
        >
          <GripVertical size={13} />
        </div>

        {/* 1. Cursor / Move Mode */}
        <button
          type="button"
          onClick={() => handleSelectTool(null)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
            activeTool === null
              ? "bg-[#2962ff] text-white shadow-md shadow-[#2962ff]/30 font-bold"
              : "text-(--muted) hover:bg-[#1e222d] hover:text-white"
          }`}
          title="Pointer / Select & Move Mode (Esc)"
        >
          <MousePointer size={15} />
        </button>

        <div className="h-px w-5 bg-(--card-border)/70 my-0.5" />

        {/* 2. Line Tools Group */}
        <div className="relative">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => handleSelectTool(lastLineTool)}
              className={`flex h-8 w-7 items-center justify-center rounded-l-lg transition-all cursor-pointer ${
                LINE_TOOLS.some((t) => t.kind === activeTool)
                  ? "bg-[#2962ff] text-white shadow-md shadow-[#2962ff]/30 font-bold"
                  : "text-(--muted) hover:bg-[#1e222d] hover:text-white"
              }`}
              title={`Trend & Line Tools: ${LINE_TOOLS.find((t) => t.kind === lastLineTool)?.label}`}
            >
              <TrendingUp size={15} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCategory("lines");
              }}
              className={`flex h-8 w-3 items-center justify-center rounded-r-lg text-[9px] transition-colors cursor-pointer ${
                LINE_TOOLS.some((t) => t.kind === activeTool)
                  ? "bg-[#2962ff] text-white/80"
                  : "text-(--muted) hover:bg-[#1e222d] hover:text-white"
              }`}
              title="Expand Line Tools Menu"
            >
              ▸
            </button>
          </div>

          {openCategory === "lines" && (
            <div className="absolute left-11 top-0 z-50 w-64 max-h-[min(340px,55vh)] overflow-y-auto p-1.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] shadow-2xl backdrop-blur-md flex flex-col gap-0.5 text-xs text-white">
              <span className="text-[10px] uppercase font-bold text-(--muted) px-2 py-1 tracking-wider border-b border-[#2a2e39]/60">
                Lines & Trend Tools
              </span>
              {LINE_TOOLS.map((t) => (
                <button
                  key={t.kind}
                  type="button"
                  onClick={() => handleSelectTool(t.kind)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    activeTool === t.kind ? "bg-[#2962ff] text-white font-semibold" : "hover:bg-[#2a2e39] text-[#d1d4dc]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {t.icon}
                    <span>{t.label}</span>
                  </div>
                  {t.desc && <span className="text-[10px] text-(--muted) hidden sm:inline">{t.desc}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 3. Fibonacci & Gann Tools Group */}
        <div className="relative">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => handleSelectTool(lastFibTool)}
              className={`flex h-8 w-7 items-center justify-center rounded-l-lg transition-all cursor-pointer ${
                FIB_TOOLS.some((t) => t.kind === activeTool)
                  ? "bg-[#2962ff] text-white shadow-md shadow-[#2962ff]/30 font-bold"
                  : "text-(--muted) hover:bg-[#1e222d] hover:text-white"
              }`}
              title={`Fibonacci & Gann Tools: ${FIB_TOOLS.find((t) => t.kind === lastFibTool)?.label}`}
            >
              <Percent size={15} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCategory("fib");
              }}
              className={`flex h-8 w-3 items-center justify-center rounded-r-lg text-[9px] transition-colors cursor-pointer ${
                FIB_TOOLS.some((t) => t.kind === activeTool)
                  ? "bg-[#2962ff] text-white/80"
                  : "text-(--muted) hover:bg-[#1e222d] hover:text-white"
              }`}
              title="Expand Fibonacci & Gann Menu"
            >
              ▸
            </button>
          </div>

          {openCategory === "fib" && (
            <div className="absolute left-11 top-0 z-50 w-64 max-h-[min(340px,55vh)] overflow-y-auto p-1.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] shadow-2xl backdrop-blur-md flex flex-col gap-0.5 text-xs text-white">
              <div className="flex items-center justify-between border-b border-[#2a2e39]/60 px-2 py-1">
                <span className="text-[10px] uppercase font-bold text-(--muted) tracking-wider">
                  Fibonacci & Gann
                </span>
                <button
                  type="button"
                  onClick={handleAutoFibonacci}
                  className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={11} /> Auto-Fib
                </button>
              </div>
              {FIB_TOOLS.map((t) => (
                <button
                  key={t.kind}
                  type="button"
                  onClick={() => handleSelectTool(t.kind)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    activeTool === t.kind ? "bg-[#2962ff] text-white font-semibold" : "hover:bg-[#2a2e39] text-[#d1d4dc]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {t.icon}
                    <span>{t.label}</span>
                  </div>
                  {t.desc && <span className="text-[10px] text-(--muted) hidden sm:inline">{t.desc}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Brushes & Freehand Drawings Group */}
        <div className="relative">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => handleSelectTool(lastBrushTool)}
              className={`flex h-8 w-7 items-center justify-center rounded-l-lg transition-all cursor-pointer ${
                BRUSH_TOOLS.some((t) => t.kind === activeTool)
                  ? "bg-[#2962ff] text-white shadow-md shadow-[#2962ff]/30 font-bold"
                  : "text-(--muted) hover:bg-[#1e222d] hover:text-white"
              }`}
              title={`Brushes & Drawings: ${BRUSH_TOOLS.find((t) => t.kind === lastBrushTool)?.label}`}
            >
              <Brush size={15} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCategory("brushes");
              }}
              className={`flex h-8 w-3 items-center justify-center rounded-r-lg text-[9px] transition-colors cursor-pointer ${
                BRUSH_TOOLS.some((t) => t.kind === activeTool)
                  ? "bg-[#2962ff] text-white/80"
                  : "text-(--muted) hover:bg-[#1e222d] hover:text-white"
              }`}
              title="Expand Brushes Menu"
            >
              ▸
            </button>
          </div>

          {openCategory === "brushes" && (
            <div className="absolute left-11 -top-5 z-50 w-60 max-h-[min(300px,50vh)] overflow-y-auto p-1.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] shadow-2xl backdrop-blur-md flex flex-col gap-0.5 text-xs text-white">
              <span className="text-[10px] uppercase font-bold text-(--muted) px-2 py-1 tracking-wider border-b border-[#2a2e39]/60">
                Brushes & Freehand
              </span>
              {BRUSH_TOOLS.map((t) => (
                <button
                  key={t.kind}
                  type="button"
                  onClick={() => handleSelectTool(t.kind)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    activeTool === t.kind ? "bg-[#2962ff] text-white font-semibold" : "hover:bg-[#2a2e39] text-[#d1d4dc]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {t.icon}
                    <span>{t.label}</span>
                  </div>
                  {t.desc && <span className="text-[10px] text-(--muted) hidden sm:inline">{t.desc}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 5. Geometric Shapes Group */}
        <div className="relative">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => handleSelectTool(lastShapeTool)}
              className={`flex h-8 w-7 items-center justify-center rounded-l-lg transition-all cursor-pointer ${
                SHAPE_TOOLS.some((t) => t.kind === activeTool)
                  ? "bg-[#2962ff] text-white shadow-md shadow-[#2962ff]/30 font-bold"
                  : "text-(--muted) hover:bg-[#1e222d] hover:text-white"
              }`}
              title={`Shapes: ${SHAPE_TOOLS.find((t) => t.kind === lastShapeTool)?.label}`}
            >
              <Square size={15} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCategory("shapes");
              }}
              className={`flex h-8 w-3 items-center justify-center rounded-r-lg text-[9px] transition-colors cursor-pointer ${
                SHAPE_TOOLS.some((t) => t.kind === activeTool)
                  ? "bg-[#2962ff] text-white/80"
                  : "text-(--muted) hover:bg-[#1e222d] hover:text-white"
              }`}
              title="Expand Shapes Menu"
            >
              ▸
            </button>
          </div>

          {openCategory === "shapes" && (
            <div className="absolute left-11 -bottom-5 z-50 w-56 max-h-[min(280px,50vh)] overflow-y-auto p-1.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] shadow-2xl backdrop-blur-md flex flex-col gap-0.5 text-xs text-white">
              <span className="text-[10px] uppercase font-bold text-(--muted) px-2 py-1 tracking-wider border-b border-[#2a2e39]/60">
                Geometric Shapes
              </span>
              {SHAPE_TOOLS.map((t) => (
                <button
                  key={t.kind}
                  type="button"
                  onClick={() => handleSelectTool(t.kind)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    activeTool === t.kind ? "bg-[#2962ff] text-white font-semibold" : "hover:bg-[#2a2e39] text-[#d1d4dc]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {t.icon}
                    <span>{t.label}</span>
                  </div>
                  {t.desc && <span className="text-[10px] text-(--muted) hidden sm:inline">{t.desc}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 6. Annotation & Text Group */}
        <div className="relative">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => handleSelectTool(lastTextTool)}
              className={`flex h-8 w-7 items-center justify-center rounded-l-lg transition-all cursor-pointer ${
                TEXT_TOOLS.some((t) => t.kind === activeTool)
                  ? "bg-[#2962ff] text-white shadow-md shadow-[#2962ff]/30 font-bold"
                  : "text-(--muted) hover:bg-[#1e222d] hover:text-white"
              }`}
              title={`Text & Annotations: ${TEXT_TOOLS.find((t) => t.kind === lastTextTool)?.label}`}
            >
              <Type size={15} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCategory("text");
              }}
              className={`flex h-8 w-3 items-center justify-center rounded-r-lg text-[9px] transition-colors cursor-pointer ${
                TEXT_TOOLS.some((t) => t.kind === activeTool)
                  ? "bg-[#2962ff] text-white/80"
                  : "text-(--muted) hover:bg-[#1e222d] hover:text-white"
              }`}
              title="Expand Text Menu"
            >
              ▸
            </button>
          </div>

          {openCategory === "text" && (
            <div className="absolute left-11 -bottom-5 z-50 w-56 max-h-[min(300px,50vh)] overflow-y-auto p-1.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] shadow-2xl backdrop-blur-md flex flex-col gap-0.5 text-xs text-white">
              <span className="text-[10px] uppercase font-bold text-(--muted) px-2 py-1 tracking-wider border-b border-[#2a2e39]/60">
                Text & Markers
              </span>
              {TEXT_TOOLS.map((t) => (
                <button
                  key={t.kind}
                  type="button"
                  onClick={() => handleSelectTool(t.kind)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    activeTool === t.kind ? "bg-[#2962ff] text-white font-semibold" : "hover:bg-[#2a2e39] text-[#d1d4dc]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {t.icon}
                    <span>{t.label}</span>
                  </div>
                  {t.desc && <span className="text-[10px] text-(--muted) hidden sm:inline">{t.desc}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 7. Patterns & Waves Group */}
        <div className="relative">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => handleSelectTool(lastPatternTool)}
              className={`flex h-8 w-7 items-center justify-center rounded-l-lg transition-all cursor-pointer ${
                PATTERN_TOOLS.some((t) => t.kind === activeTool)
                  ? "bg-[#2962ff] text-white shadow-md shadow-[#2962ff]/30 font-bold"
                  : "text-(--muted) hover:bg-[#1e222d] hover:text-white"
              }`}
              title={`Harmonic & Elliott Wave Patterns: ${PATTERN_TOOLS.find((t) => t.kind === lastPatternTool)?.label}`}
            >
              <Waves size={15} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCategory("patterns");
              }}
              className={`flex h-8 w-3 items-center justify-center rounded-r-lg text-[9px] transition-colors cursor-pointer ${
                PATTERN_TOOLS.some((t) => t.kind === activeTool)
                  ? "bg-[#2962ff] text-white/80"
                  : "text-(--muted) hover:bg-[#1e222d] hover:text-white"
              }`}
              title="Expand Patterns Menu"
            >
              ▸
            </button>
          </div>

          {openCategory === "patterns" && (
            <div className="absolute left-11 bottom-0 z-50 w-64 max-h-[min(320px,50vh)] overflow-y-auto p-1.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] shadow-2xl backdrop-blur-md flex flex-col gap-0.5 text-xs text-white">
              <span className="text-[10px] uppercase font-bold text-(--muted) px-2 py-1 tracking-wider border-b border-[#2a2e39]/60">
                Harmonic & Elliott Waves
              </span>
              {PATTERN_TOOLS.map((t) => (
                <button
                  key={t.kind}
                  type="button"
                  onClick={() => handleSelectTool(t.kind)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    activeTool === t.kind ? "bg-[#2962ff] text-white font-semibold" : "hover:bg-[#2a2e39] text-[#d1d4dc]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {t.icon}
                    <span>{t.label}</span>
                  </div>
                  {t.desc && <span className="text-[10px] text-(--muted) hidden sm:inline">{t.desc}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-px w-5 bg-(--card-border)/70 my-0.5" />

        {/* 8. Forecasting & Measurement Group (Long/Short, Position Forecast, Range) */}
        <div className="relative">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => handleSelectTool(lastForecastTool)}
              className={`flex h-8 w-7 items-center justify-center rounded-l-lg transition-all cursor-pointer ${
                FORECAST_TOOLS.some((t) => t.kind === activeTool)
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold"
                  : "text-emerald-400 hover:bg-[#1e222d] hover:text-white"
              }`}
              title={`Forecasting & Risk/Reward: ${FORECAST_TOOLS.find((t) => t.kind === lastForecastTool)?.label}`}
            >
              {lastForecastTool === "short-position" ? (
                <ArrowDownRight size={16} className="text-red-400" />
              ) : (
                <ArrowUpRight size={16} className="text-emerald-400" />
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCategory("forecast");
              }}
              className={`flex h-8 w-3 items-center justify-center rounded-r-lg text-[9px] transition-colors cursor-pointer ${
                FORECAST_TOOLS.some((t) => t.kind === activeTool)
                  ? "bg-emerald-600 text-white/80"
                  : "text-(--muted) hover:bg-[#1e222d] hover:text-white"
              }`}
              title="Expand Forecasting Menu"
            >
              ▸
            </button>
          </div>

          {openCategory === "forecast" && (
            <div className="absolute left-11 bottom-0 z-50 w-64 max-h-[min(320px,50vh)] overflow-y-auto p-1.5 rounded-xl bg-[#1e222d] border border-[#2a2e39] shadow-2xl backdrop-blur-md flex flex-col gap-0.5 text-xs text-white">
              <span className="text-[10px] uppercase font-bold text-(--muted) px-2 py-1 tracking-wider border-b border-[#2a2e39]/60">
                Forecasting & Measurement
              </span>
              {FORECAST_TOOLS.map((t) => (
                <button
                  key={t.kind}
                  type="button"
                  onClick={() => handleSelectTool(t.kind)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    activeTool === t.kind ? "bg-[#2962ff] text-white font-semibold" : "hover:bg-[#2a2e39] text-[#d1d4dc]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {t.icon}
                    <span>{t.label}</span>
                  </div>
                  {t.desc && <span className="text-[10px] text-(--muted) hidden sm:inline">{t.desc}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-px w-5 bg-(--card-border)/70 my-0.5" />

        {/* 9. Magnet Snap Mode */}
        <button
          type="button"
          onClick={handleToggleMagnet}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
            magnetMode !== "off"
              ? "bg-amber-400/20 text-amber-400 border border-amber-400/30 font-bold"
              : "text-(--muted) hover:bg-[#1e222d]"
          }`}
          title={`Magnet Snapping: ${magnetMode.toUpperCase()} (Snaps to High, Low, Open, Close)`}
        >
          <Magnet size={15} />
        </button>

        {/* 10. Stay in Drawing Mode */}
        <button
          type="button"
          onClick={handleToggleStayInMode}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
            stayInDrawingMode
              ? "bg-[#2962ff]/20 text-[#93c5fd] border border-[#2962ff]/40 font-bold"
              : "text-(--muted) hover:bg-[#1e222d]"
          }`}
          title={stayInDrawingMode ? "Stay in Drawing Mode: ON (Tool stays armed)" : "Stay in Drawing Mode: OFF"}
        >
          {stayInDrawingMode ? <Lock size={14} /> : <Unlock size={14} />}
        </button>

        {/* 11. Toggle Visibility */}
        <button
          type="button"
          onClick={handleToggleVisibility}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all cursor-pointer ${
            drawingsVisible ? "text-(--muted) hover:bg-[#1e222d]" : "text-amber-400 bg-amber-400/10"
          }`}
          title={drawingsVisible ? "Hide All Drawings" : "Show All Drawings"}
        >
          {drawingsVisible ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>

        {/* 12. Clear All Drawings */}
        <button
          type="button"
          onClick={handleClearAll}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-400/15 transition-all cursor-pointer"
          title="Clear All Drawings on Chart"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* 2. ACTIVE TOOL HINT NOTIFICATION BANNER (TOP-CENTER) */}
      {activeTool && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1e222d]/95 border border-[#2a2e39] backdrop-blur-md shadow-2xl text-xs font-medium text-white select-none animate-fadeIn">
          <span className="font-semibold text-amber-300">
            {
              [
                ...LINE_TOOLS,
                ...FIB_TOOLS,
                ...BRUSH_TOOLS,
                ...SHAPE_TOOLS,
                ...TEXT_TOOLS,
                ...PATTERN_TOOLS,
                ...FORECAST_TOOLS,
              ].find((t) => t.kind === activeTool)?.label || activeTool
            }
          </span>
          <span className="text-(--muted)">· Click on the chart to place</span>

          <button
            type="button"
            onClick={() => handleSelectTool(null)}
            className="ml-2 px-2 py-0.5 rounded bg-(--pill-bg) hover:bg-white/10 text-[10px] text-(--muted) hover:text-white transition-colors cursor-pointer"
          >
            Done (Esc)
          </button>
        </div>
      )}

      {/* 3. SELECTION ACTION BAR (WHEN DRAWINGS ARE SELECTED) */}
      {selectedIds.length > 0 && activeTool === null && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-1.5 rounded-xl bg-[#1e222d]/95 border border-[#2a2e39] backdrop-blur-md shadow-2xl text-xs select-none animate-fadeIn">
          <span className="text-[10px] font-mono text-(--muted) px-2 uppercase font-bold">
            {selectedIds.length} Selected
          </span>

          <button
            type="button"
            onClick={handleDeleteSelected}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
            title="Delete Selected Drawing (Delete / Backspace)"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="p-1 rounded text-(--muted) hover:text-white cursor-pointer"
            title="Deselect"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
