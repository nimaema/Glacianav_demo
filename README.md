# GlaciaNav Ice Watch — demo

Interactive sea-ice and iceberg monitor for the Nordic and Arctic seas.

A CARTO Voyager basemap carries two analytic model layers: a continuous
**sea-ice thickness field** rendered as a raster overlay (winter-maximum
scenario, sea areas only) and a Monte Carlo **iceberg drift forecast** with
containment ellipses, ensemble tracks and a probability heat field. A 24-hour
scrubber drives both.

> The geophysics is a self-contained mock tuned to look plausible — no live
> satellite feed. Everything derives from two deterministic functions, so the
> map, the cursor probe and the panel statistics can never disagree.

## Features

- **Sea ice** — continuous thickness field with the Baltic sub-basins
  (Bothnian Bay/Sea, Gulfs of Finland and Riga), the Arctic pack down to Bear
  Island and Pechora, and the East Greenland belt through Denmark Strait. Ice
  is masked to water, never painted on land.
- **Ice properties** — per-region mean/max thickness, cover and 24 h trend;
  click any ice for a point analysis with a 24 h thickness sparkline; hover
  anywhere for a live probe readout.
- **Icebergs** — 9 tracked bergs, each with a drift regime. Selecting one
  shows a direction-probability rose, expected drift, 90% radius, 50/90%
  containment ellipses and ensemble spaghetti tracks.
- **Forecast timeline** — scrub or play 0 → +24 h; the ice field, drift
  probabilities and every statistic update together.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
react-leaflet 5 · Framer Motion · lucide-react

## Local development

```bash
npm install
npm run dev        # http://localhost:3311/demo
npm run typecheck  # types are checked here, not during next build
```

The app is served under the `/demo` base path (see `basePath` in
`next.config.mjs`), matching where it is published in production.

## Docker

Build and run the production image:

```bash
docker compose up -d --build app
```

The app listens on port 3000 inside the container and is published to
`127.0.0.1:3311` on the host for smoke-testing.

## Deploying behind Cloudflare

The compose file ships a `cloudflared` sidecar, so the server needs no open
inbound ports — the tunnel dials out to Cloudflare.

1. In the Cloudflare **Zero Trust** dashboard, go to
   **Networks → Tunnels → Create a tunnel** (type: Cloudflared).
2. Copy the tunnel token from the install command it shows you.
3. On the server:

   ```bash
   cp .env.example .env
   # paste the token into TUNNEL_TOKEN
   ```

4. In the tunnel's **Public hostname** tab, add a route:

   | Field   | Value              |
   | ------- | ------------------ |
   | Domain  | `glacianav.com`    |
   | Path    | `demo*`            |
   | Service | `http://app:3000`  |

   `app` is the compose service name, resolved on the shared `web` network.
   The path must be listed **above** any catch-all route for the same
   hostname, since cloudflared matches rules top-down.

5. Start everything:

   ```bash
   docker compose up -d --build
   ```

Cloudflare terminates TLS at the edge, so no certificates are needed on the
server. To make the app reachable *only* through the tunnel, drop the `ports:`
block from the `app` service.

### Updating

```bash
git pull
docker compose up -d --build app
```
