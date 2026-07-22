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
npm run dev        # http://localhost:3311
npm run typecheck  # types are checked here, not during next build
```

## Docker

Build and run the production image:

```bash
docker compose up -d --build app
```

The app listens on port 3000 inside the container and is published to
`127.0.0.1:3311` on the host for smoke-testing.

## Deploying behind Cloudflare

The app is served at the root, so it wants its own hostname
(`demo.glacianav.com`) via its own tunnel — see **standalone** below.

> A hostname's DNS can only be routed by **one** Cloudflare Tunnel. Adding a
> second tunnel for a hostname another tunnel already owns fails with
> "Failed to add published application".

### Publishing on its own hostname (standalone tunnel)

1. **Zero Trust → Networks → Tunnels → Create a tunnel** (type: Cloudflared).
   Create it in the **same Cloudflare account that holds the `glacianav.com`
   zone** — otherwise the public hostname saves into the tunnel's ingress but
   no DNS record is ever created, and the name fails to resolve.
2. Copy the token from the install command.
3. On the server:

   ```bash
   cp .env.example .env      # paste the token into TUNNEL_TOKEN
   docker compose --profile standalone up -d --build
   ```

4. Add the public hostname: `demo.glacianav.com` → service
   **`http://app:3000`**.

   `app` is the compose service name. Do **not** use `http://localhost:3311`
   — inside the cloudflared container `localhost` is that container itself,
   not the host, so nothing is listening there.

5. Confirm DNS actually exists (the dashboard should have created it):

   ```bash
   dig +short demo.glacianav.com     # expect a CNAME/proxied answer
   ```

   If it is empty, add it by hand in **DNS → Records**: `CNAME`, name
   `demo`, target `<TUNNEL-ID>.cfargotunnel.com`, **Proxied**.

### Publishing under a path on an existing hostname (shared tunnel)

Only if the demo must live at `glacianav.com/demo` instead. This requires
`basePath: "/demo"` in `next.config.mjs`, or every asset 404s.

1. Find the Docker network the existing tunnel runs on:

   ```bash
   docker ps --filter ancestor=cloudflare/cloudflared --format '{{.Names}}'
   docker inspect <tunnel-container> \
     --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}'
   ```

2. Bring the demo up joined to that network:

   ```bash
   git clone https://github.com/nimaema/Glacianav_demo.git
   cd Glacianav_demo
   TUNNEL_NETWORK=<network-from-step-1> docker compose \
     -f docker-compose.yml -f docker-compose.tunnel.yml up -d --build app
   ```

   No `.env` and no second `cloudflared` are needed here.

3. In the **existing** tunnel's **Public hostname** tab, add a route:

   | Field   | Value                          |
   | ------- | ------------------------------ |
   | Domain  | `glacianav.com`                |
   | Path    | `demo*`                        |
   | Service | `http://glacianav-demo:3000`   |

   Drag it **above** the existing catch-all rule for `glacianav.com` —
   cloudflared matches rules top-down, so a catch-all listed first would
   swallow `/demo`.

Verify the tunnel can reach the container by name:

```bash
docker run --rm --network <network> curlimages/curl -s -o /dev/null \
  -w '%{http_code}\n' http://glacianav-demo:3000/demo    # expect 200
```

### Updating

```bash
git pull
docker compose --profile standalone up -d --build     # standalone tunnel
```

