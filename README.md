# The Amenity by Alexander v2

Luxury travel itinerary builder — Claude AI + Google Places + Leaflet maps.

## What it does

- Day-by-day itinerary (breakfast → activities → dinner)
- Optional zone/neighborhood filter (e.g. "Zona Romántica" in Vallarta)
- Budget-consistent food ($ never mixes with $$$$)
- Restaurant menu links + activity booking links
- Walking and driving times between every stop
- Live ratings, photos, and Google Maps links via Google Places
- Interactive Leaflet map with all stops
- Downloadable PNG map
- Print-to-PDF button

## Architecture

```
GitHub → Cloudflare Pages (frontend)
              ↕
     Cloudflare Worker (proxy)
        ↙           ↘
  Anthropic API   Google Places API
```

API keys live only in the Worker — never exposed to the browser.

---

## Deploy

### Step 1 — Cloudflare Worker

1. Go to [workers.cloudflare.com](https://workers.cloudflare.com) → Create Worker
2. Paste the contents of `worker/index.js`
3. Deploy it — copy the Worker URL (e.g. `https://the-amenity-worker.xyz.workers.dev`)
4. Go to Worker → Settings → Variables → add two **Secrets**:
   - `ANTHROPIC_API_KEY` → from [console.anthropic.com](https://console.anthropic.com)
   - `GOOGLE_API_KEY` → from [console.cloud.google.com](https://console.cloud.google.com)

Make sure these APIs are enabled in Google Cloud:
- **Places API (New)**
- **Maps Static API**

### Step 2 — GitHub

Push this folder to a GitHub repo.

### Step 3 — Cloudflare Pages

1. [pages.cloudflare.com](https://pages.cloudflare.com) → Connect to Git → select your repo
2. Build settings:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. Environment variables (in Pages settings):
   - `VITE_WORKER_URL` = your Worker URL from Step 1

Deploy → done. Your app is live.

---

## Local dev

```bash
# 1. Install
npm install

# 2. Create .env.local
cp .env.local.example .env.local
# Set VITE_WORKER_URL=http://localhost:8787

# 3. Create .dev.vars for the Worker
echo "ANTHROPIC_API_KEY=sk-ant-..." > .dev.vars
echo "GOOGLE_API_KEY=AIzaSy..." >> .dev.vars

# 4. Run both (two terminals)
npm run dev:worker   # Terminal 1
npm run dev          # Terminal 2
```
