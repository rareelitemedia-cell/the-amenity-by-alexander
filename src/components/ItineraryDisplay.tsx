import { motion } from 'motion/react';
import { ArrowUpRight, UtensilsCrossed, Ticket, Clock, Car, Footprints } from 'lucide-react';
import { cn } from '../lib/utils';
import { ItineraryResponse, ItineraryItem } from '../types';
import { ThinkingProcess } from './ThinkingProcess';

interface Props {
  data: ItineraryResponse;
  showThinking?: boolean;
}

const TYPE_COLOR: Record<string, string> = {
  attraction: '#A38A5E',
  restaurant: '#9B5E5E',
  activity:   '#5E9B6B',
  travel:     '#5E7A9B',
};

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= full ? '#A38A5E' : 'rgba(229,229,229,0.15)', fontSize: 11 }}>★</span>
      ))}
      <span className="text-[10px] font-mono text-white/40 ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

function TravelBadge({ item, isLast }: { item: ItineraryItem; isLast: boolean }) {
  if (isLast || (!item.walkingTime && !item.drivingTime)) return null;
  return (
    <div className="flex items-center gap-4 py-2 px-4 ml-[115px] border-l border-white/5">
      {item.walkingTime && (
        <span className="flex items-center gap-1.5 text-[10px] text-white/25">
          <Footprints className="w-3 h-3" /> {item.walkingTime}
        </span>
      )}
      {item.drivingTime && (
        <span className="flex items-center gap-1.5 text-[10px] text-white/25">
          <Car className="w-3 h-3" /> {item.drivingTime}
        </span>
      )}
    </div>
  );
}

function ItemCard({ item, index, isLast }: { item: ItineraryItem; index: number; isLast: boolean }) {
  const menuLink = item.menuUrl || (item.type === 'restaurant' ? item.places?.website : null);
  const bookLink = item.bookingUrl || (item.type !== 'restaurant' ? item.places?.website : null);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className="group"
      >
        {/* Photo */}
        {item.places?.photoUrl && (
          <div className="relative h-36 overflow-hidden mb-0">
            <img
              src={item.places.photoUrl}
              alt={item.activity}
              className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-500"
              style={{ filter: 'grayscale(15%) contrast(1.05)' }}
              onError={e => (e.currentTarget.parentElement!.style.display = 'none')}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, #0A0A0B)' }} />
            {/* Time overlay on photo */}
            <span className="absolute bottom-3 left-4 text-xs font-mono text-white/60">{item.time}</span>
          </div>
        )}

        <div className={cn('flex py-5 border-b border-white/[0.06]', item.type === 'travel' && 'opacity-40')}>
          {/* Time (shown when no photo) */}
          {!item.places?.photoUrl && (
            <span className="w-28 min-w-28 text-xs font-mono text-white/30 text-right pr-6 pt-0.5 shrink-0 tracking-tight">
              {item.time}
            </span>
          )}
          {item.places?.photoUrl && <div className="w-28 min-w-28 shrink-0" />}

          {/* Timeline dot */}
          <div
            className="w-2 h-2 rounded-full border shrink-0 mt-1 group-hover:scale-125 transition-transform"
            style={{ borderColor: `${TYPE_COLOR[item.type]}80`, backgroundColor: '#0A0A0B' }}
          />

          <div className="flex-1 pl-6 min-w-0">
            <h3 className="text-base font-bold uppercase tracking-tight group-hover:text-primary transition-colors truncate mb-1">
              {item.activity}
            </h3>

            <p className="text-xs text-white/45 font-serif italic leading-relaxed mb-3 max-w-lg">
              {item.description}
            </p>

            {/* Meta row */}
            <div className="flex items-center flex-wrap gap-3 mb-2">
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: TYPE_COLOR[item.type] }}>
                {item.type}
              </span>
              {item.places?.rating && <Stars rating={item.places.rating} />}
              {item.places?.reviewCount && (
                <span className="text-[10px] font-mono text-white/25">
                  {item.places.reviewCount.toLocaleString()} reviews
                </span>
              )}
              {item.priceRange && (
                <span className="text-[10px] font-mono text-white/40">{item.priceRange}</span>
              )}
            </div>

            {/* Location */}
            <p className="text-[11px] text-white/25 mb-3">{item.location}</p>

            {/* Action links */}
            <div className="flex items-center gap-4 flex-wrap">
              {item.places?.mapsUrl && (
                <a href={item.places.mapsUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/30 hover:text-primary transition-colors">
                  <ArrowUpRight className="w-3 h-3" /> Google Maps
                </a>
              )}
              {menuLink && (
                <a href={menuLink} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/30 hover:text-primary transition-colors">
                  <UtensilsCrossed className="w-3 h-3" /> View Menu
                </a>
              )}
              {bookLink && item.type !== 'restaurant' && (
                <a href={bookLink} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/30 hover:text-primary transition-colors">
                  <Ticket className="w-3 h-3" /> Reserve
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Travel time between stops */}
      <TravelBadge item={item} isLast={isLast} />
    </>
  );
}

export function ItineraryDisplay({ data, showThinking }: Props) {
  return (
    <div className="relative h-full flex flex-col">
      {/* City watermark */}
      <div className="absolute top-0 right-0 text-[120px] md:text-[180px] font-black text-white/[0.025] leading-none pointer-events-none select-none uppercase tracking-tighter overflow-hidden z-0">
        {data.city}
      </div>

      <div className="relative z-10 flex flex-col h-full overflow-y-auto custom-scrollbar pr-2">
        {showThinking && data.thoughtProcess && (
          <div className="mb-16 max-w-xl">
            <ThinkingProcess thoughts={data.thoughtProcess} />
          </div>
        )}

        {data.itinerary.map((day, di) => (
          <div key={di} className="mb-24 last:mb-0">
            {/* Day header */}
            <header className="mb-6 border-b border-white/10 pb-5 flex justify-between items-end">
              <div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">
                  JOURNEY {String(day.day || di + 1).padStart(2, '0')}
                </h2>
                {day.theme && (
                  <p className="text-xs text-white/30 uppercase tracking-widest mt-1">{day.theme}</p>
                )}
              </div>
              <p className="text-sm italic font-serif text-primary">
                Curated for {data.type}
              </p>
            </header>

            <section>
              {day.items?.map((item, ii) => (
                <ItemCard
                  key={ii}
                  item={item}
                  index={ii}
                  isLast={ii === (day.items?.length || 0) - 1}
                />
              ))}
            </section>
          </div>
        ))}

        {/* Footer */}
        <footer className="mt-auto py-10 flex justify-between items-center border-t border-white/10">
          <div className="flex gap-8">
            <span className="text-[10px] uppercase tracking-widest text-white/40">
              STATUS: <span className="text-white ml-2">READY</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-white/40">
              DURATION: <span className="text-white ml-2">{data.duration} DAYS</span>
            </span>
            {data.zone && (
              <span className="text-[10px] uppercase tracking-widest text-white/40">
                ZONE: <span className="text-primary ml-2">{data.zone}</span>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {data.itinerary.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-primary' : 'bg-white/10'}`} />
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
