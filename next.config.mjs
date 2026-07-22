/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits .next/standalone with a minimal server + only the needed
  // node_modules, so the runtime image stays small.
  output: "standalone",

  typescript: {
    // This project uses TypeScript 7 (the native Go port), whose package has
    // no JS API entry point for Next's built-in type-check integration to
    // load. Types are checked by `npm run typecheck` instead — run it in CI
    // or before deploying.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
