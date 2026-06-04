import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, UtensilsCrossed, Ticket, Car, Footprints, Download, Loader } from 'lucide-react';
import jsPDF from 'jspdf';
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
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= full ? '#A38A5E' : 'rgba(229,229,229,0.15)', fontSize: 11 }}>★</span>
      ))}
      <span className="text-[10px] font-mono text-white/40 ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

function TravelBadge({ item }: { item: ItineraryItem }) {
  const hasWalking = item.walkingTime && item.walkingTime.trim() !== '';
  const hasDriving = item.drivingTime && item.drivingTime.trim() !== '';
  if (!hasWalking && !hasDriving) return null;
  return (
    <div className="flex items-center gap-6 py-2 pl-32 text-[10px] text-white/25">
      <div className="flex items-center gap-5">
        {hasWalking && (
          <span className="flex items-center gap-1.5">
            <Footprints className="w-3 h-3 text-white/20" />
            {item.walkingTime}
          </span>
        )}
        {hasDriving && (
          <span className="flex items-center gap-1.5">
            <Car className="w-3 h-3 text-white/20" />
            {item.drivingTime}
          </span>
        )}
      </div>
      <div className="flex-1 border-t border-dashed border-white/[0.06]" />
    </div>
  );
}

function ItemCard({ item, index, isLast }: { item: ItineraryItem; index: number; isLast: boolean }) {
  const menuLink = item.menuUrl && item.menuUrl !== '' ? item.menuUrl : (item.type === 'restaurant' ? item.places?.website : null);
  const bookLink = item.bookingUrl && item.bookingUrl !== '' ? item.bookingUrl : (item.type !== 'restaurant' ? item.places?.website : null);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className="group"
      >
        {item.places?.photoUrl && (
          <div className="relative h-36 overflow-hidden">
            <img src={item.places.photoUrl} alt={item.activity}
              className="w-full h-full object-cover opacity-50 group-hover:opacity-65 transition-opacity duration-500"
              style={{ filter: 'grayscale(15%) contrast(1.05)' }}
              onError={e => (e.currentTarget.parentElement!.style.display = 'none')} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, #0A0A0B)' }} />
            <span className="absolute bottom-3 left-4 text-xs font-mono text-white/50">{item.time}</span>
          </div>
        )}

        <div className={cn('flex py-5 border-b border-white/[0.06]', item.type === 'travel' && 'opacity-40')}>
          <span className="w-28 min-w-28 text-xs font-mono text-white/30 text-right pr-6 pt-0.5 shrink-0 tracking-tight">
            {!item.places?.photoUrl ? item.time : ''}
          </span>
          <div className="w-2 h-2 rounded-full border shrink-0 mt-1 group-hover:scale-125 transition-transform"
            style={{ borderColor: `${TYPE_COLOR[item.type] || TYPE_COLOR.attraction}80`, backgroundColor: '#0A0A0B' }} />
          <div className="flex-1 pl-6 min-w-0">
            <h3 className="text-base font-bold uppercase tracking-tight group-hover:text-primary transition-colors truncate mb-1">
              {item.activity}
            </h3>
            <p className="text-xs text-white/45 font-serif italic leading-relaxed mb-3 max-w-lg">
              {item.description}
            </p>
            <div className="flex items-center flex-wrap gap-3 mb-2">
              <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: TYPE_COLOR[item.type] || TYPE_COLOR.attraction }}>
                {item.type}
              </span>
              {item.places?.rating && <Stars rating={item.places.rating} />}
              {item.places?.reviewCount && (
                <span className="text-[10px] font-mono text-white/25">{item.places.reviewCount.toLocaleString()} reviews</span>
              )}
              {item.priceRange && <span className="text-[10px] font-mono text-white/40">{item.priceRange}</span>}
            </div>
            <p className="text-[11px] text-white/25 mb-3">{item.location}</p>
            <div className="flex items-center gap-5 flex-wrap">
              {item.places?.mapsUrl && (
                <a href={item.places.mapsUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/30 hover:text-primary transition-colors">
                  <ArrowUpRight className="w-3 h-3" /> Google Maps
                </a>
              )}
              {menuLink && (
                <a href={menuLink} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/30 hover:text-primary transition-colors">
                  <UtensilsCrossed className="w-3 h-3" /> Ver Menú
                </a>
              )}
              {bookLink && item.type !== 'restaurant' && (
                <a href={bookLink} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/30 hover:text-primary transition-colors">
                  <Ticket className="w-3 h-3" /> Reservar
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      {!isLast && <TravelBadge item={item} />}
    </>
  );
}

// ── Fetch photo as base64 ─────────────────────────────────────────
async function fetchBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Generate PDF with photos ──────────────────────────────────────
async function generatePDF(data: ItineraryResponse): Promise<void> {
  // Pre-fetch all photos in parallel
  const photoUrls = data.itinerary
    .flatMap(d => d.items)
    .filter(i => i.places?.photoUrl)
    .map(i => i.places!.photoUrl!);

  const photoMap: Record<string, string | null> = {};
  await Promise.all(
    [...new Set(photoUrls)].map(async (url) => {
      photoMap[url] = await fetchBase64(url);
    })
  );

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  const checkPage = (needed = 10) => {
    if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
  };

  // ── Cover header ──────────────────────────────────────────────
  doc.setFillColor(10, 10, 11);
  doc.rect(0, 0, pageW, 48, 'F');
  doc.setTextColor(163, 138, 94);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('THE AMENITY BY ALEXANDER  ·  LUXURY TRAVEL ADVISORY', margin, 13);
  doc.setTextColor(229, 229, 229);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text(data.city.toUpperCase(), margin, 30);
  doc.setTextColor(163, 138, 94);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const metaStr = [
    data.duration + (data.duration === 1 ? ' Day' : ' Days'),
    data.type, data.budget, data.zone,
  ].filter(Boolean).join('  ·  ');
  doc.text(metaStr, margin, 41);
  y = 56;

  // ── Days ──────────────────────────────────────────────────────
  for (const day of data.itinerary) {
    checkPage(22);
    doc.setDrawColor(163, 138, 94);
    doc.setLineWidth(0.25);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(`JOURNEY ${String(day.day).padStart(2, '0')}`, margin, y);
    if (day.theme) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(130, 130, 130);
      doc.text(day.theme.toUpperCase(), margin, y + 5);
      y += 12;
    } else {
      y += 8;
    }

    for (let i = 0; i < (day.items?.length || 0); i++) {
      const item = day.items[i];
      const isLast = i === day.items.length - 1;

      // Photo
      const photoB64 = item.places?.photoUrl ? photoMap[item.places.photoUrl] : null;
      if (photoB64) {
        checkPage(50);
        try {
          doc.addImage(photoB64, 'JPEG', margin, y, contentW, 44);
          y += 46;
        } catch (_) {}
      }

      checkPage(22);

      // Time + name
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 160);
      doc.text(item.time, margin, y);

      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 20, 20);
      doc.text(item.activity.toUpperCase(), margin + 20, y);
      y += 5;

      // Description
      if (item.description) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(90, 90, 90);
        const lines = doc.splitTextToSize(item.description, contentW - 20);
        checkPage(lines.length * 4 + 3);
        doc.text(lines, margin + 20, y);
        y += lines.length * 4 + 1;
      }

      // Location + price
      const loc = [item.location, item.priceRange].filter(Boolean).join('  ·  ');
      if (loc) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(140, 140, 140);
        doc.text(loc, margin + 20, y);
        y += 4;
      }

      // Rating
      if (item.places?.rating) {
        doc.setFontSize(7.5);
        doc.setTextColor(163, 138, 94);
        const ratingStr = `★ ${item.places.rating.toFixed(1)}${item.places.reviewCount ? '  (' + item.places.reviewCount.toLocaleString() + ' reviews)' : ''}`;
        doc.text(ratingStr, margin + 20, y);
        y += 4;
      }

      // Travel time to next
      if (!isLast && (item.walkingTime || item.drivingTime)) {
        y += 1;
        doc.setFontSize(7);
        doc.setTextColor(180, 180, 180);
        const times = [
          item.walkingTime ? `Walk: ${item.walkingTime}` : '',
          item.drivingTime ? `Drive: ${item.drivingTime}` : '',
        ].filter(Boolean).join('   ');
        doc.text(times, margin + 20, y);
        y += 6;
      } else {
        y += 5;
      }
    }
    y += 6;
  }

  // Footer
  checkPage(10);
  doc.setDrawColor(163, 138, 94);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 4;
  doc.setFontSize(6.5);
  doc.setTextColor(163, 138, 94);
  doc.text('ESTABLISHED MMXXVI  ·  ALEXANDER TRAVEL ADVISORY GROUP  ·  CLAUDE + GOOGLE PLACES', margin, y);

  doc.save(`${data.city.toLowerCase().replace(/\s+/g, '-')}-itinerary.pdf`);
}

// ── Main component ────────────────────────────────────────────────
export function ItineraryDisplay({ data, showThinking }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      await generatePDF(data);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="relative h-full flex flex-col">
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
            <header className="mb-6 border-b border-white/10 pb-5 flex justify-between items-end">
              <div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">
                  JOURNEY {String(day.day || di + 1).padStart(2, '0')}
                </h2>
                {day.theme && <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">{day.theme}</p>}
              </div>
              <p className="text-sm italic font-serif text-primary">Curated for {data.type}</p>
            </header>
            <section>
              {day.items?.map((item, ii) => (
                <ItemCard key={ii} item={item} index={ii} isLast={ii === (day.items?.length || 0) - 1} />
              ))}
            </section>
          </div>
        ))}

        <footer className="mt-auto py-10 border-t border-white/10">
          <div className="flex justify-between items-center">
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
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="flex items-center gap-2 border border-primary/30 text-primary text-[10px] uppercase tracking-widest px-4 py-2 hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              {pdfLoading
                ? <><Loader className="w-3 h-3 animate-spin" /> Generating...</>
                : <><Download className="w-3 h-3" /> Download PDF</>
              }
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
