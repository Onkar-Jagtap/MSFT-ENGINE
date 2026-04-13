import React from "react";
import { motion } from "motion/react";

interface UploadCardProps {
  label: string;
  hint: string;
  icon: string;
  file: File | null;
  drag: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UploadCard({ label, hint, icon, file, drag, onDragOver, onDragLeave, onDrop, onChange }: UploadCardProps) {
  return (
    <motion.label
      layout
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative block cursor-pointer overflow-hidden border-2 transition-all duration-300 
        ${drag ? "border-primary bg-primary/20 scale-[1.03] shadow-[0_0_40px_rgba(0,243,255,0.7)] z-10" : "border-white/5 bg-black/40 hover:border-primary/40 hover:bg-black/60"}
        ${file ? "border-success/40 bg-success/5" : ""}`}
    >
      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onChange} />
      
      {/* HUD Brackets */}
      <div className="hud-bracket-tl opacity-60" />
      <div className="hud-bracket-tr opacity-60" />
      <div className="hud-bracket-bl opacity-60" />
      <div className="hud-bracket-br opacity-60" />

      {/* Laser Scan Effect - only when awaiting input */}
      {!file && <div className="scan-line" />}

      <div className="flex flex-col items-center justify-center p-8 text-center">
        {file && (
          <motion.div 
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center bg-success text-[10px] font-black text-black shadow-[0_0_10px_rgba(0,255,65,0.5)]"
          >
            OK
          </motion.div>
        )}
        
        <motion.div 
          layout
          className={`mb-4 flex h-16 w-16 items-center justify-center border-2 text-3xl transition-all duration-300
          ${file ? "border-success/30 bg-success/10 neon-text" : "border-primary/20 bg-primary/5 neon-text"}`}
        >
          {icon}
        </motion.div>
        
        <motion.div layout className="font-display mb-2 text-sm font-black tracking-widest text-text-pri uppercase">{label}</motion.div>
        <motion.div layout className="font-mono text-[10px] leading-relaxed tracking-tight text-text-sec uppercase opacity-70">{hint}</motion.div>
        
        {file ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 inline-block border border-success/30 bg-success/10 px-3 py-1.5 font-mono text-[10px] font-bold text-success uppercase tracking-widest"
          >
            {file.name}
          </motion.div>
        ) : (
          <motion.div layout className="mt-4 font-mono text-[9px] text-text-mut uppercase tracking-[0.2em]">
            [ <span className="text-primary animate-pulse">awaiting_input</span> ]
          </motion.div>
        )}
      </div>
    </motion.label>
  );
}
