import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the Docker/VPS deployment path; Hostinger's managed
  // web-app hosting uses the regular `next start`, so only opt in when asked.
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
  // A stray lockfile in the home directory makes Turbopack mis-infer the root.
  turbopack: { root: process.cwd() },
  // Canonicalize www → apex (single permanent redirect, host-matched).
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: "www.tabarcaboats.com" }],
        destination: "https://tabarcaboats.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
