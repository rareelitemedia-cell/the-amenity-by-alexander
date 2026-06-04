import React from 'react';
import { motion } from 'motion/react';
import { BrainCircuit, CheckCircle2 } from 'lucide-react';

interface ThinkingProcessProps {
  thoughts: string[];
}

export function ThinkingProcess({ thoughts }: ThinkingProcessProps) {
  if (!thoughts || thoughts.length === 0) return null;

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        <BrainCircuit className="w-4 h-4 text-primary" />
        <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/60">
          Curator's Reasoning
        </h3>
      </div>

      <div className="space-y-4">
        {thoughts.map((thought, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2 }}
            className="flex gap-4 group"
          >
            <CheckCircle2 className="w-3 h-3 text-primary/40 mt-1 shrink-0 group-hover:text-primary transition-colors" />
            <p className="text-xs text-white/40 group-hover:text-white/60 transition-colors leading-relaxed font-light italic">
              {thought}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
