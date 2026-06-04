import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Sparkles, List, Map, Printer } from 'lucide-react';
import { ItineraryForm } from './components/ItineraryForm';
import { ItineraryDisplay } from './components/ItineraryDisplay';
import { ItineraryMap } from './components/ItineraryMap';
import { ThinkingProcess } from './components/ThinkingProcess';
import { generateItinerary, enrichItinerary } from './services/api';
import { ItineraryResponse, FormValues } from './types';
import { cn } from './lib/utils';

const LOADING_MSGS = [
  'Analyzing historical topology...',
  'Curating culinary landmarks...',
  'Calculating optimal temporal flows...',
  'Verifying heritage site availability...',
  'Finalizing bespoke journey map...',
];

const ENRICHING_MSGS = [
  'Connecting to Google Places...',
  'Fetching live ratings & reviews...',
  'Pulling venue photos...',
  'Building Maps links...',
  'Almost done...',
];

type Phase = 'idle' | 'generating' | 'enriching' | 'done';
type View  = 'list' | 'map';

export default function App() {
  const [phase, setPhase]       = useState<Phase>('idle');
  const [view, setView]         = useState<View>('list');
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState(true);
  const [step, setStep]         = useState(0);

  const isLoading = phase === 'generating' || phase === 'enriching';
  const msgs = phase === 'enriching' ? ENRICHING_MSGS : LOADING_MSGS;

  const handleGenerate = async ({ city, zone, type, days, budget, thinking }: FormValues) => {
    setItinerary(null);
    setError(null);
    setShowThinking(thinking);
    setView('list');
    setPhase('generating');
    setStep(0);

    const iv1 = setInterval(() => setStep(s => (s + 1) % 5), 1400);

    try {
      const data = await generateItinerary(city, zone, type, days, budget);
      clearInterval(iv1);

      setPhase('enriching');
      setStep(0);
      const iv2 = setInterval(() => setStep(s => (s + 1) % 5), 1000);

      const enriched = await enrichItinerary(data.itinerary, city);
      clearInterval(iv2);

      setItinerary({ ...data, itinerary: enriched });
      setPhase('done');
    } catch (err) {
      clearInterval(iv1);
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setPhase('idle');
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden">

      {/* ── SIDEBAR ── */}
      <aside className="w-[380px] min-w-[380px] border-r border-white/10 p-10 flex flex-col justify-between h-full bg-bg-dark z-20 overflow-y-auto">
        <div className="space-y-12">
          {/* Logo */}
          <div
            className="cursor-pointer"
            onClick={() => { setItinerary(null); setError(null); setPhase('idle'); }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black">
                <Compass className="w-4 h-4" />
              </div>
              <h1 className="text-5xl bold-heading leading-[0.85] tracking-tighter">
                The<br />Amenity
              </h1>
            </div>
            <p className="text-primary font-serif italic text-xl tracking-wide ml-1">by Alexander</p>
          </div>

          {/* Form */}
          <div>
            <h2 className="label-micro opacity-100 mb-6">Curate Your Journey</h2>
            <ItineraryForm onGenerate={handleGenerate} isLoading={isLoading} />
          </div>

          {error && (
            <div className="p-4 border border-red-500/20 bg-red-500/5 rounded">
              <p className="text-xs text-red-400 font-serif italic mb-2">{error}</p>
              <button
                type="button"
                onClick={() => { setError(null); setPhase('idle'); }}
                className="text-[10px] uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors"
              >
                Clear & Retry
              </button>
            </div>
          )}
        </div>

        <footer className="mt-8 opacity-20 hover:opacity-100 transition-opacity">
          <div className="text-[9px] uppercase tracking-[0.3em] font-medium leading-loose">
            Established MMXXVI<br />
            Alexander Travel Advisory Group<br />
            Claude · Google Places · Cloudflare
          </div>
        </footer>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 bg-bg-dark flex flex-col overflow-hidden">

        {/* View switcher + Print — only when itinerary is ready */}
        {itinerary && (
          <div className="flex items-center justify-between px-8 py-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-1">
              {(['list', 'map'] as View[]).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors',
                    view === v ? 'text-primary border-b border-primary' : 'text-white/30 hover:text-white/60'
                  )}
                >
                  {v === 'list' ? <List className="w-3 h-3" /> : <Map className="w-3 h-3" />}
                  {v}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/30 hover:text-primary transition-colors"
            >
              <Printer className="w-3 h-3" /> Print Itinerary
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {itinerary ? (
              view === 'list' ? (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full p-8 md:p-14 overflow-hidden"
                >
                  <ItineraryDisplay data={itinerary} showThinking={showThinking} />
                </motion.div>
              ) : (
                <motion.div
                  key="map"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <ItineraryMap data={itinerary} />
                </motion.div>
              )
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center p-8 text-center gap-10"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-[100px] animate-pulse" />
                  <h3 className="text-[120px] md:text-[200px] bold-heading text-white/[0.03] select-none leading-none">
                    VOYAGE
                  </h3>
                </div>

                <div className="max-w-md space-y-3 relative z-10">
                  <p className="text-primary font-serif italic text-2xl">
                    {error ? 'Curation Interrupted' : 'Awaiting your destination'}
                  </p>
                  <p className="text-white/40 text-sm leading-relaxed font-light">
                    {error || 'Input your city, choose a zone if you want precision, and let Claude craft a budget-consistent journey.'}
                  </p>
                </div>

                {isLoading && (
                  <div className="flex flex-col items-center gap-5">
                    <div className="w-16 h-16 border border-primary/20 rounded-full flex items-center justify-center relative">
                      <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-center space-y-2">
                      <span className="text-[10px] uppercase tracking-[0.5em] text-primary block">
                        {phase === 'enriching' ? 'Google Places' : 'The Archives'}
                      </span>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={step}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-xs text-white/40 font-serif italic"
                        >
                          {msgs[step]}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
