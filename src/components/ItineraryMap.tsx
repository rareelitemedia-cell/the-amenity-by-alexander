import { useEffect, useRef } from 'react';
import { Download, MapPin } from 'lucide-react';
import { ItineraryResponse } from '../types';
import { downloadMap } from '../services/api';

interface Props {
  data: ItineraryResponse;
}

const DAY_COLORS = ['#A38A5E', '#5E9BA3', '#8F6B68', '#6B8F68', '#7A5E9B', '#9B8A5E', '#5E7A9B'];

export function ItineraryMap({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      import('leaflet/dist/leaflet.css');

      const map = L.map(containerRef.current!, { zoomControl: true, attributionControl: true });
      mapRef.current = map;

      // OpenStreetMap tiles — free, no key needed
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const allLatLngs: [number, number][] = [];

      data.itinerary.forEach((day, di) => {
        const color = DAY_COLORS[di % DAY_COLORS.length];
        const dayLatLngs: [number, number][] = [];
        let stopNum = 0;

        day.items.forEach((item) => {
          if (!item.places?.lat || !item.places?.lng || item.type === 'travel') return;
          stopNum++;
          const lat = item.places.lat;
          const lng = item.places.lng;
          allLatLngs.push([lat, lng]);
          dayLatLngs.push([lat, lng]);

          // Custom numbered circle marker
          const icon = L.divIcon({
            html: `
              <div style="
                width:30px;height:30px;border-radius:50%;
                background:${color};color:white;
                display:flex;align-items:center;justify-content:center;
                font-size:11px;font-weight:700;font-family:sans-serif;
                border:2px solid rgba(255,255,255,0.9);
                box-shadow:0 2px 8px rgba(0,0,0,0.35);
              ">${stopNum}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            className: '',
          });

          const popup = L.popup({ maxWidth: 240 }).setContent(`
            <div style="font-family:sans-serif;padding:4px 0">
              <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px">
                Day ${day.day} · ${item.time}
              </div>
              <div style="font-size:14px;font-weight:700;margin-bottom:4px;line-height:1.2">
                ${item.activity}
              </div>
              <div style="font-size:11px;color:#555;margin-bottom:6px">${item.location}</div>
              ${item.places?.rating ? `<div style="font-size:11px;color:#A38A5E;margin-bottom:6px">★ ${item.places.rating.toFixed(1)}</div>` : ''}
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${item.places?.mapsUrl ? `<a href="${item.places.mapsUrl}" target="_blank" style="font-size:11px;color:#A38A5E;text-decoration:none;font-weight:600">Google Maps →</a>` : ''}
                ${(item.menuUrl || item.bookingUrl) ? `<a href="${item.menuUrl || item.bookingUrl}" target="_blank" style="font-size:11px;color:#5E9BA3;text-decoration:none;font-weight:600">${item.type === 'restaurant' ? 'Menu →' : 'Book →'}</a>` : ''}
              </div>
            </div>
          `);

          L.marker([lat, lng], { icon }).bindPopup(popup).addTo(map);
        });

        // Dashed route line per day
        if (dayLatLngs.length > 1) {
          L.polyline(dayLatLngs, {
            color,
            weight: 2.5,
            opacity: 0.7,
            dashArray: '6, 10',
          }).addTo(map);
        }
      });

      // Fit map to all markers
      if (allLatLngs.length > 0) {
        map.fitBounds(allLatLngs, { padding: [40, 40] });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [data]);

  const handleDownload = async () => {
    await downloadMap(data.itinerary, data.city);
  };

  return (
    <div className="relative h-full flex flex-col">
      {/* Map legend */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          {data.itinerary.map((day, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: DAY_COLORS[i % DAY_COLORS.length] }}
              />
              <span className="text-[10px] uppercase tracking-widest text-white/50">Day {day.day}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center gap-2 border border-primary/30 text-primary text-[10px] uppercase tracking-widest px-3 py-2 hover:bg-primary/10 transition-colors"
        >
          <Download className="w-3 h-3" />
          Download Map
        </button>
      </div>

      {/* Leaflet map container */}
      <div ref={containerRef} className="flex-1" style={{ minHeight: 0 }} />

      {/* No coordinates warning */}
      {data.itinerary.every(d => d.items.every(i => !i.places?.lat)) && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-dark/80 z-[1000]">
          <div className="text-center p-8 max-w-sm">
            <MapPin className="w-8 h-8 text-primary/40 mx-auto mb-4" />
            <p className="text-white/60 text-sm font-serif italic">
              Map coordinates come from Google Places enrichment. Make sure your Worker has a valid <code className="text-primary text-xs">GOOGLE_API_KEY</code>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
