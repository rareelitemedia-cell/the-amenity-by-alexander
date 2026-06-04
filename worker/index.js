const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const err = (msg, status = 500) => json({ error: msg }, status);

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const { pathname } = new URL(request.url);

    // ── Anthropic: generate itinerary ──────────────────────────────
    if (pathname === '/api/itinerary' && request.method === 'POST') {
      const body = await request.json();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return json(data, res.status);
    }

    // ── Google Places (New): search venues ─────────────────────────
    if (pathname === '/api/places' && request.method === 'POST') {
      const { query, fieldMask } = await request.json();
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': env.GOOGLE_API_KEY,
          'X-Goog-FieldMask': fieldMask ||
            'places.id,places.displayName,places.rating,places.userRatingCount,' +
            'places.googleMapsUri,places.websiteUri,places.photos,places.location,' +
            'places.regularOpeningHours,places.priceLevel',
        },
        body: JSON.stringify(query),
      });
      const data = await res.json();
      return json(data, res.status);
    }

    // ── Google Places: photo proxy (key never leaves server) ───────
    if (pathname === '/api/photo') {
      const { searchParams } = new URL(request.url);
      const name = searchParams.get('name');
      const maxWidth = searchParams.get('w') || '800';
      if (!name) return err('Missing name', 400);
      const res = await fetch(
        `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidth}&key=${env.GOOGLE_API_KEY}`
      );
      const img = await res.arrayBuffer();
      return new Response(img, {
        status: res.status,
        headers: {
          ...CORS,
          'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=604800',
        },
      });
    }

    // ── Google Static Maps: downloadable map PNG ───────────────────
    if (pathname === '/api/staticmap') {
      const { markers, city } = await request.json();
      if (!markers?.length) return err('No markers', 400);

      const DAY_COLORS = ['FF6B35', 'A38A5E', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 'DDA0DD'];

      const markerParams = markers.map(({ lat, lng, day, label }) => {
        const color = DAY_COLORS[(day - 1) % DAY_COLORS.length];
        return `markers=color:0x${color}|label:${label}|${lat},${lng}`;
      }).join('&');

      const url = `https://maps.googleapis.com/maps/api/staticmap?size=1200x800&scale=2&maptype=roadmap&${markerParams}&key=${env.GOOGLE_API_KEY}`;
      const res = await fetch(url);
      const img = await res.arrayBuffer();

      return new Response(img, {
        status: res.status,
        headers: {
          ...CORS,
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="${city}-itinerary-map.png"`,
        },
      });
    }

    return err('Not found', 404);
  },
};
