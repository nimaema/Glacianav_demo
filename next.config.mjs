/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits .next/standalone with a minimal server + only the needed
  // node_modules, so the runtime image stays small.
  output: "standalone",

  // Served at https://glacianav.com/demo behind a reverse proxy. This makes
  // Next emit asset URLs under /demo/_next/... so the proxy can forward the
  // path through unchanged. Local dev also moves to localhost:3311/demo.
  basePath: "/demo",

  typescript: {
    // This project uses TypeScript 7 (the native Go port), whose package has
    // no JS API entry point for Next's built-in type-check integration to
    // load. Types are checked by `npm run typecheck` instead — run it in CI
    // or before deploying.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
