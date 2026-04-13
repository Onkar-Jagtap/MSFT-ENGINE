import React from "react";
import { motion } from "motion/react";

export function NavBar({ phase, onReset, onProcess, ready }: { phase: string, onReset: () => void, onProcess: () => void, ready: boolean }) {
  const statusColor = phase === "done" ? "#00ff41" : phase === "running" ? "#f3ff00" : "#00f3ff";
  const statusBg = phase === "done" ? "rgba(0,255,65,0.1)" : phase === "running" ? "rgba(243,255,0,0.1)" : "rgba(0,243,255,0.1)";
  const statusLabel = phase === "done" ? "SYSTEM READY" : phase === "running" ? "PROCESSING..." : "IDLE";

  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-primary/30 bg-black/80 px-8 backdrop-blur-md cyber-grid">
      <div className="flex items-center gap-4">
        <div className={`h-3 w-3 rounded-full transition-all duration-300 ${phase === "running" ? "bg-accent shadow-[0_0_20px_rgba(255,0,255,1)] animate-ping" : "bg-primary shadow-[0_0_15px_rgba(0,243,255,0.8)] animate-pulse"}`} />
        <div className="flex flex-col">
          <span className="font-display text-lg font-black tracking-widest text-primary neon-text">
            MSFT ENGINE
          </span>
          <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-accent uppercase">
            BY PJA // CORE_V4
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end mr-4">
          <span className="font-mono text-[9px] text-text-mut uppercase tracking-tighter">Status</span>
          <span className="font-mono text-xs font-bold" style={{ color: statusColor }}>
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            className="group relative flex h-10 items-center justify-center border border-accent/50 bg-accent/5 px-6 font-display text-[11px] font-bold tracking-widest text-accent transition-all hover:bg-accent/20 hover:neon-border"
            onClick={onReset}
          >
            <span className="relative z-10">RESET_CORE</span>
            <div className="absolute inset-0 -z-10 bg-accent/10 opacity-0 transition-opacity group-hover:opacity-100" />
          </motion.button>

          <motion.button
            whileHover={{ scale: ready && phase !== "running" ? 1.05 : 1 }}
            whileTap={{ scale: ready && phase !== "running" ? 0.95 : 1 }}
            className="group relative flex h-10 items-center justify-center overflow-hidden border border-primary bg-primary/10 px-8 font-display text-[11px] font-bold tracking-widest text-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/20 hover:neon-border glitch-hover"
            onClick={onProcess}
            disabled={!ready || phase === "running"}
          >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
            <motion.div 
              animate={{ top: ["-10%", "110%"] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="absolute left-0 right-0 h-[1px] bg-primary/50 shadow-[0_0_5px_rgba(0,243,255,0.8)]"
            />
            {phase === "running" ? (
              <div className="flex items-center gap-3 relative z-10">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                <span>EXECUTING...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 relative z-10">
                <span>RUN_PIPELINE</span>
              </div>
            )}
          </motion.button>
        </div>
      </div>
    </nav>
  );
}
