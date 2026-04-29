import type { NextConfig } from "next";

const nextConfig = {
  // Silence the workspace root warning for Turbopack
  experimental: {
  },
  // In some versions it's top-level, in others experimental. 
  // Let's try to just use what the warning suggests if possible.
} as any;

export default nextConfig;
