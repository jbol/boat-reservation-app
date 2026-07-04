import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for the Docker/VPS deployment path; Hostinger's managed
  // web-app hosting uses the regular `next start`, so only opt in when asked.
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
  // A stray lockfile in the home directory makes Turbopack mis-infer the root.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
