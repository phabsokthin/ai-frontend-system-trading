"use client";

import Link from "next/link";
import {
    CheckCircle2,
    Cpu,
    Radio,
    ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function Footer() {

    const [year, setYear] = useState<number | null>(null);

    useEffect(() => {
        setYear(new Date().getFullYear());
    }, []);
    return (
        <footer className="mt-8 border-t border-[#2a2e39] pt-6 pb-8 text-[#71829a] text-xs">
            {/* Top telemetry bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1e222d] text-[11px]">
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="online-dot" />
                        <span className="font-semibold text-[#a7b5c8]">MT5 Bridge:</span>
                        <span className="text-[#32d6a0] font-mono">Connected (XAU/USD)</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Radio size={14} className="text-[#65b7ff]" />
                        <span className="font-semibold text-[#a7b5c8]">Data Feed:</span>
                        <span className="text-[#65b7ff] font-mono">Twelve Data WebSocket Live</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Cpu size={14} className="text-[#c084fc]" />
                        <span className="font-semibold text-[#a7b5c8]">Engine:</span>
                        <span className="text-[#c084fc] font-mono">EMA9/21/50 + RSI Confluence</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[#8fa1b8]">
                    <ShieldCheck size={15} className="text-[#32d6a0]" />
                    <span>Execution Risk Guard: <strong>Enabled (1.5% Max Risk)</strong></span>
                </div>
            </div>

            {/* Main footer row */}
            <div className="footer">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <span className="font-semibold text-[#a7b5c8]">
                        <p>&copy; {year} AI Trading System (Version 1.0.0)</p>
                    </span>
             
                   
                    <span className="hidden sm:inline text-[#2a2e39]">&bull;</span>
                    <nav className="flex items-center gap-4 text-[11px]">
                        <Link href="/dashboard" className="hover:text-white transition-colors">
                            Dashboard
                        </Link>
                        <Link href="/chart" className="hover:text-white transition-colors">
                            AI Analysis
                        </Link>
                    
                    </nav>
                </div>

                <span>
                    <CheckCircle2 size={14} />
                    <span>MetaTrader 5 Algorithmic Engine Synchronized By<b>Thin Developer</b> </span>
                </span>
            </div>

            {/* Legal & Market Risk Disclaimer */}
            <p className="mt-2 text-[10px] leading-relaxed text-[#5a6a80]">
                Risk Disclaimer: Trading financial instruments—including stocks, foreign exchange (Forex), futures, options, contracts for difference (CFDs), and cryptocurrencies—carries a high level of risk and may not be suitable for all investors.
            </p>
        </footer>
    );
}
