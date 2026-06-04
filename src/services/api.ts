import { ItineraryResponse, ItineraryItem } from '../types';

const W = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

// ── Build the Claude prompt ────────────────────────────────────────
function buildPrompt(city: string, zone: string, type: string, days: number, budget: string): string {
  const budgetRules: Record<string, string> = {
    budget:       '$ only — street food, taquerías, mercados, fondas, casual local spots. No sit-down restaurants over $15 USD per person.',
    moderate:     '$$ — mid-range sit-down restaurants, casual bistros, popular local favorites. Max ~$40 USD per person.',
    luxury:       '$$$ — upscale restaurants, wine bars, chef-driven concepts, polished service. $50–$120 USD per person.',
    'ultra-luxury': '$$$$ — fine dining, Michelin-starred or equivalent, omakase, tasting menus, private clubs. $120+ USD per person.',
  };

  return `Create a bespoke ${days}-day travel itinerary for ${city}${zone ? `, focused on ${zone}` : ''}.
Travel style: ${type} | Budget tier: ${budget}

BUDGET RULE (strict): ${budgetRules[budget] || budgetRules.moderate}
Every single restaurant and food stop must match this budget tier exactly. Do NOT mix tiers.

For each day, start with breakfast, include lunch and dinner, and add activities/attractions between meals.

For RESTAURANTS: include "menuUrl" — the direct link to their online menu (restaurant website menu page, Google Maps menu link, or leave "" if unknown).
For ACTIVITIES/ATTRACTIONS: include "bookingUrl" — direct link to buy tickets or book (official website, Airbnb Experiences, Viator, etc. or "" if free entry).
For travel between stops: include "walkingTime" (e.g. "14 min walk") AND "drivingTime" (e.g. "5 min drive / taxi") to the NEXT stop. Leave "" for the last item of each day.
For "placesQuery": write the most specific Google Places search string to find this exact venue (e.g. "Café de Tacuba historic center Mexico City").

Respond ONLY with raw valid JSON — no markdown, no backticks, no explanation:
{
  "city": "string",
  "zone": "${zone || ''}",
  "type": "string",
  "budget": "string",
  "duration": number,
  "thoughtProcess": ["string","string","string","string"],
  "itinerary": [{
    "day": number,
    "theme": "string (e.g. 'Historic Center & Local Markets')",
    "items": [{
      "time": "08:00 AM",
      "activity": "string (venue name)",
      "description": "string (evocative, specific, 1-2 sentences)",
      "location": "string (real street address or neighborhood)",
      "priceRange": "string (e.g. '$12 pp' or '$$$')",
      "type": "attraction|restaurant|activity|travel",
      "menuUrl": "string",
      "bookingUrl": "string",
      "walkingTime": "string",
      "drivingTime": "string",
      "placesQuery": "string"
    }]
  }]
}`;
}

// ── Generate itinerary via Claude ──────────────────────────────────
export async function generateItinerary(
  city: string,
  zone: string,
  type: string,
  days: number,
  budget: string
): Promise<ItineraryResponse> {
  const res = await fetch(`${W}/api/itinerary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 10000,
      system: 'You are an elite travel curator for "The Amenity by Alexander". You only recommend real, existing venues. Respond ONLY with raw valid JSON — no markdown, no backticks, nothing else.',
      messages: [{ role: 'user', content: buildPrompt(city, zone, type, days, budget) }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Worker error ${res.status}`);

  const raw: string = data.content?.[0]?.text || '';
  const clean = raw.replace(/```json\n?|```\n?/g, '').trim();
  return JSON.parse(clean) as ItineraryResponse;
}

// ── Enrich one item with Google Places ────────────────────────────
async function enrichItem(item: ItineraryItem, city: string): Promise<ItineraryItem> {
  if (item.type === 'travel') return item;
  try {
    const res = await fetch(`${W}/api/places`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: {
          textQuery: item.placesQuery || `${item.activity} ${city}`,
          maxResultCount: 1,
        },
      }),
    });
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return item;

    let photoUrl: string | null = null;
    if (place.photos?.[0]?.name) {
      photoUrl = `${W}/api/photo?name=${encodeURIComponent(place.photos[0].name)}&w=900`;
    }

    return {
      ...item,
      // Use Places website if Claude didn't find one
      menuUrl: item.menuUrl || (item.type === 'restaurant' ? place.websiteUri || '' : ''),
      bookingUrl: item.bookingUrl || (item.type !== 'restaurant' ? place.websiteUri || '' : ''),
      places: {
        rating: place.rating,
        reviewCount: place.userRatingCount,
        mapsUrl: place.googleMapsUri,
        website: place.websiteUri || null,
        photoUrl,
        lat: place.location?.latitude,
        lng: place.location?.longitude,
      },
    };
  } catch {
    return item;
  }
}

// ── Enrich full itinerary ─────────────────────────────────────────
export async function enrichItinerary(
  itinerary: ItineraryResponse['itinerary'],
  city: string
): Promise<ItineraryResponse['itinerary']> {
  return Promise.all(
    itinerary.map(async (day) => ({
      ...day,
      items: await Promise.all(day.items.map((item) => enrichItem(item, city))),
    }))
  );
}

// ── Download map via Google Static Maps ───────────────────────────
export async function downloadMap(
  itinerary: ItineraryResponse['itinerary'],
  city: string
): Promise<void> {
  const markers = itinerary.flatMap((day) =>
    day.items
      .filter((item) => item.places?.lat && item.places?.lng && item.type !== 'travel')
      .map((item, i) => ({
        lat: item.places!.lat!,
        lng: item.places!.lng!,
        day: day.day,
        label: String(i + 1),
      }))
  );

  if (!markers.length) {
    alert('No map coordinates available. Make sure Google Places is configured.');
    return;
  }

  const res = await fetch(`${W}/api/staticmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markers, city }),
  });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${city.toLowerCase().replace(/\s+/g, '-')}-itinerary-map.png`;
  a.click();
  URL.revokeObjectURL(url);
}
