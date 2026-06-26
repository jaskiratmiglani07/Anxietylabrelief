import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type BreathState = 'inhale' | 'hold-in' | 'exhale' | 'hold-out';

interface BreathingIndicatorProps {
  breathState: BreathState;
  secondsRemaining: number;
}

export const BreathingIndicator: React.FC<BreathingIndicatorProps> = ({
  breathState,
  secondsRemaining
}) => {
  const getStateText = () => {
    switch (breathState) {
      case 'inhale': return 'Breathe in';
      case 'hold-in': return 'Hold';
      case 'exhale': return 'Breathe out';
      case 'hold-out': return 'Rest';
    }
  };

  // Ring scaling based on breathing phase
  const getScale = () => {
    switch (breathState) {
      case 'inhale':
        return 1.4;
      case 'hold-in': 
        return 1.4;
      case 'exhale': 
        return 1.0;
      case 'hold-out': 
        return 1.0;
    }
  };

  const getTransitionDuration = () => {
    switch (breathState) {
      case 'inhale': return 4;
      case 'exhale': return 4;
      default: return 2; // holds are 2s long
    }
  };

  return (
    <div className="flex flex-col items-center justify-center relative w-56 h-56 select-none pointer-events-none">
      {/* Outer Breathing Rings (Layer 0) */}
      <motion.div
        animate={{
          scale: getScale(),
          opacity: breathState === 'inhale' || breathState === 'hold-in' ? 0.38 : 0.18,
        }}
        transition={{
          duration: getTransitionDuration(),
          ease: "easeInOut"
        }}
        style={{ borderColor: 'var(--accent-color)' }}
        className="absolute inset-0 border border-solid rounded-full filter blur-[1px] z-0"
      />

      <motion.div
        animate={{
          scale: getScale() * 0.82,
          opacity: breathState === 'inhale' || breathState === 'hold-in' ? 0.22 : 0.1,
          boxShadow: `0 0 30px var(--glow-color)`
        }}
        transition={{
          duration: getTransitionDuration(),
          ease: "easeInOut"
        }}
        style={{ borderColor: 'var(--accent-color)', backgroundColor: 'var(--accent-subtle)' }}
        className="absolute inset-6 border border-solid rounded-full filter blur-[2px] z-0"
      />

      {/* Inner Pulsing Core (Pulsing outwards from behind the glass lens) */}
      <motion.div
        animate={{
          scale: getScale() * 0.42,
          opacity: 0.65
        }}
        transition={{
          duration: getTransitionDuration(),
          ease: "easeInOut"
        }}
        style={{ backgroundColor: 'var(--accent-color)' }}
        className="absolute w-20 h-20 rounded-full filter blur-[5px] z-0"
      />

      {/* Translucent Dark Glassmorphic Lens for Contrast & Depth (Layer 10) */}
      <div 
        className="absolute w-[96px] h-[96px] rounded-full bg-neutral-950/55 backdrop-blur-[6px] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.65)] z-10" 
      />

      {/* State Text & Count (Layer 20) */}
      <div className="absolute flex flex-col items-center justify-center text-center z-20 pointer-events-none select-none">
        <AnimatePresence mode="wait">
          <motion.p
            key={breathState}
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="text-sm font-semibold uppercase tracking-[0.18em] text-white select-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]"
            style={{
              textShadow: '0 0 10px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.9)'
            }}
          >
            {getStateText()}
          </motion.p>
        </AnimatePresence>
        
        <span 
          className="text-xs text-neutral-200 font-mono mt-1 font-semibold tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
        >
          {secondsRemaining}s
        </span>
      </div>
    </div>
  );
};
