import { ItineraryResponse, ItineraryItem } from '../types';

const W = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

function buildPrompt(city: string, zone: string, type: string, days: number, budget: string, customPrompt: string): string {
  const budgetRules: Record<string, string> = {
    budget:         '$ only — street food, taquerías, mercados, fondas, casual local spots under $15 USD pp.',
    moderate:       '$$ — mid-range sit-down restaurants, casual bistros, popular local favorites, ~$15–40 USD pp.',
    luxury:         '$$$ — upscale restaurants, chef-driven concepts, polished service, $50–120 USD pp.',
    'ultra-luxury': '$$$$ — fine dining, Michelin-level, omakase, tasting menus, $120+ USD pp.',
  };

  const customSection = customPrompt.trim()
    ? `\nCRITICAL CUSTOM INSTRUCTIONS — these override defaults, follow them exactly:\n${customPrompt.trim()}\n`
    : '';

  return `Create a bespoke ${days}-day travel itinerary for ${city}${zone ? `, focused on the ${zone} area` : ''}.
Travel style: ${type} | Budget: ${budget}

BUDGET RULE (strict — no exceptions): ${budgetRules[budget] || budgetRules.moderate}
Every restaurant and food stop must match this budget tier. Do NOT mix tiers.

Start each day with breakfast, include lunch, afternoon activity, and dinner.
${customSection}
REQUIRED FIELDS for every item:
- "walkingTime": walking time to the NEXT stop (e.g. "12 min walk"). Use "" only for the last item of the day.
- "drivingTime": drive/Uber time to the NEXT stop (e.g. "5 min drive"). Use "" only for the last item of the day.
- "menuUrl": for restaurants, direct link to online menu or website. Use "" if unknown.
- "bookingUrl": for activities/attractions, direct link to book tickets. Use "" if unknown or free.
- "placesQuery": specific Google Places search string for this exact venue.

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
      "description": "string (evocative, specific, 1–2 sentences)",
      "location": "string (real address or neighborhood)",
      "priceRange": "string",
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

export async function generateItinerary(
  city: string,
  zone: string,
  type: string,
  days: number,
  budget: string,
  customPrompt: string = ''
): Promise<ItineraryResponse> {
  const res = await fetch(`${W}/api/itinerary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 10000,
      system: 'You are an elite travel curator for "The Amenity by Alexander". You only recommend real, existing venues. Respond ONLY with raw valid JSON — no markdown, no backticks, nothing else.',
      messages: [{ role: 'user', content: buildPrompt(city, zone, type, days, budget, customPrompt) }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Worker error ${res.status}`);

  const raw: string = data.content?.[0]?.text || '';
  const clean = raw.replace(/```json\n?|```\n?/g, '').trim();
  return JSON.parse(clean) as ItineraryResponse;
}

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
    alert('No map coordinates available.');
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
