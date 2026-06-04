import { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ChevronRight, BrainCircuit, MapPin, SlidersHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';
import { FormValues } from '../types';

interface Props {
  onGenerate: (values: FormValues) => void;
  isLoading: boolean;
}

export function ItineraryForm({ onGenerate, isLoading }: Props) {
  const [city, setCity]               = useState('');
  const [zone, setZone]               = useState('');
  const [type, setType]               = useState('relaxing');
  const [days, setDays]               = useState(3);
  const [budget, setBudget]           = useState('luxury');
  const [thinking, setThinking]       = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustom, setShowCustom]   = useState(false);

  const budgets = [
    { id: 'budget', label: '$' },
    { id: 'moderate', label: '$$' },
    { id: 'luxury', label: '$$$' },
    { id: 'ultra-luxury', label: '$$$$' },
  ];

  const handleSubmit = () => {
    if (city.trim()) {
      onGenerate({ city, zone, type, days, budget, thinking, customPrompt });
    }
  };

  return (
    <div className="w-full space-y-10">

      {/* Destination */}
      <div>
        <label className="label-micro">Destination</label>
        <input
          type="text"
          value={city}
          onChange={e => setCity(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="City..."
          className="luxury-input"
        />
      </div>

      {/* Zone (optional) */}
      <div>
        <label className="label-micro flex items-center gap-2">
          <MapPin className="w-3 h-3" /> Zone / Neighborhood
          <span className="text-white/20 ml-1">(optional)</span>
        </label>
        <input
          type="text"
          value={zone}
          onChange={e => setZone(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="e.g. Zona Romántica, Polanco, Centro..."
          className="luxury-input text-base"
        />
      </div>

      {/* Pace + Duration */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="label-micro">Pace</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full bg-transparent border-b border-white/20 pb-2 text-lg font-light appearance-none focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            <option className="bg-bg-dark" value="relaxing">Relaxing</option>
            <option className="bg-bg-dark" value="balanced">Moderate</option>
            <option className="bg-bg-dark" value="fast-paced">Fast-paced</option>
            <option className="bg-bg-dark" value="adventurous">Adventurous</option>
          </select>
        </div>
        <div>
          <label className="label-micro">Duration</label>
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="w-full bg-transparent border-b border-white/20 pb-2 text-lg font-light appearance-none focus:outline-none focus:border-primary transition-colors cursor-pointer"
          >
            {[1, 2, 3, 5, 7, 10, 14].map(d => (
              <option className="bg-bg-dark" key={d} value={d}>{d} {d === 1 ? 'Day' : 'Days'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Budget */}
      <div>
        <label className="label-micro">Budget Tier</label>
        <div className="flex gap-5 mt-3">
          {budgets.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBudget(b.id)}
              className={cn(
                'text-xl font-black transition-all',
                budget === b.id ? 'text-primary' : 'text-white/20 hover:text-white/40'
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-white/20 mt-2 leading-relaxed">
          {budget === 'budget' && 'Street food, taquerías, mercados'}
          {budget === 'moderate' && 'Mid-range restaurants, casual dining'}
          {budget === 'luxury' && 'Upscale, chef-driven, polished service'}
          {budget === 'ultra-luxury' && 'Fine dining, Michelin-level, omakase'}
        </p>
      </div>

      {/* Custom prompt toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className="flex items-center justify-between w-full group"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className={cn('w-3 h-3 transition-colors', showCustom || customPrompt ? 'text-primary' : 'text-white/30')} />
            <span className={cn('text-[10px] uppercase tracking-widest font-bold transition-colors', showCustom || customPrompt ? 'text-white/70' : 'text-white/30')}>
              Custom Instructions
              {customPrompt && <span className="ml-2 text-primary">●</span>}
            </span>
          </div>
          <span className="text-[9px] text-white/20">{showCustom ? '▲' : '▼'}</span>
        </button>

        {showCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3"
          >
            <textarea
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              placeholder={`Tell Claude anything extra, for example:\n\n"No seafood — I'm allergic"\n"Include a high-risk adventure activity"\n"Make sure dinner is in the Zona Romántica"\n"I'm traveling with a 5-year-old"\n"Include a cooking class"`}
              rows={5}
              className="w-full bg-transparent border border-white/10 focus:border-primary/50 outline-none p-3 text-sm text-white/70 font-light placeholder:text-white/20 resize-none transition-colors rounded-sm leading-relaxed"
            />
            {customPrompt && (
              <button
                type="button"
                onClick={() => setCustomPrompt('')}
                className="text-[10px] text-white/20 hover:text-white/40 uppercase tracking-widest mt-1 transition-colors"
              >
                Clear
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Thinking Mode */}
      <div
        className="flex items-center justify-between group cursor-pointer"
        onClick={() => setThinking(!thinking)}
      >
        <div className="flex items-center gap-3">
          <BrainCircuit className={cn('w-4 h-4 transition-colors', thinking ? 'text-primary' : 'text-white/20')} />
          <span className={cn('text-[10px] uppercase tracking-widest font-bold transition-colors', thinking ? 'text-white/80' : 'text-white/20')}>
            Curator's Reasoning
          </span>
        </div>
        <div className={cn('w-8 h-4 rounded-full relative transition-all duration-300', thinking ? 'bg-primary/20' : 'bg-white/10')}>
          <motion.div
            animate={{ x: thinking ? 16 : 4 }}
            className={cn('w-2 h-2 rounded-full absolute top-1', thinking ? 'bg-primary' : 'bg-white/40')}
          />
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading || !city.trim()}
        className="luxury-button group"
      >
        {isLoading ? (
          <><Sparkles className="w-4 h-4 animate-spin" /> CURATING...</>
        ) : (
          <>CRAFT MY JOURNEY <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-2" /></>
        )}
      </button>
    </div>
  );
}
