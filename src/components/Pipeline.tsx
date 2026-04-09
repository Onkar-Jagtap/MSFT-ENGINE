import React from "react";
import { motion } from "motion/react";

interface PipelineStepProps {
  name: string;
  index: number;
  state: string;
}

export const PipelineStep: React.FC<PipelineStepProps> = ({ name, index, state }) => {
  const color = state === "done" ? "#00ff41" : state === "running" ? "#00f3ff" : "#444444";
  const borderColor = state === "done" ? "rgba(0,255,65,0.3)" : state === "running" ? "rgba(0,243,255,0.3)" : "rgba(255,255,255,0.05)";
  
  return (
    <div className={`relative flex-1 border-r border-white/5 p-4 text-center last:border-r-0 transition-all duration-500
      ${state === "done" ? "bg-success/5" : ""}
      ${state === "running" ? "bg-primary/5" : ""}`}>
      
      {state === "running" && (
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
        />
      )}
      
      <div className="font-mono mb-1 text-[8px] font-bold tracking-[0.3em] text-text-mut uppercase">
        MOD_{index + 1}
      </div>
      <div className="font-display text-[10px] font-black tracking-widest uppercase" style={{ color }}>
        {name}
      </div>
      <div className="mt-2 flex justify-center">
        {state === "done" ? (
          <div className="h-1 w-8 bg-success shadow-[0_0_10px_rgba(0,255,65,0.8)]" />
        ) : state === "running" ? (
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <motion.div 
                key={i}
                animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
                className="h-1 w-2 bg-primary shadow-[0_0_8px_rgba(0,243,255,0.6)]"
              />
            ))}
          </div>
        ) : (
          <div className="h-1 w-8 bg-white/10" />
        )}
      </div>
    </div>
  );
}

export function StatCard({ label, value, sub, color, delay }: { label: string, value: string | number, sub: string, color: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1, ease: "easeOut" }}
      className="group relative overflow-hidden border border-white/10 bg-black/40 p-6 transition-all hover:border-primary/30 hover:bg-black/60"
    >
      <div className="absolute top-0 left-0 h-1 w-0 bg-primary transition-all duration-500 group-hover:w-full" />
      
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[9px] font-bold tracking-[0.2em] text-text-mut uppercase">
          {label}
        </div>
        <div className="font-mono text-[8px] text-primary/40">
          SEC_ID: {Math.floor(Math.random() * 1000)}
        </div>
      </div>

      <div className="font-display text-5xl font-black tracking-tighter neon-text" style={{ color }}>
        {value}
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-text-sec opacity-60">
          {sub}
        </div>
        <div className="h-1 w-12 bg-white/5 relative overflow-hidden">
          <motion.div 
            animate={{ x: ["-100%", "100%"] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="absolute inset-0 bg-primary/20"
          />
        </div>
      </div>
    </motion.div>
  );
}
