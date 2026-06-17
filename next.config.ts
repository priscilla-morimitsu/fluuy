import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Docker multi-stage build (Dockerfile copies .next/standalone).
  output: "standalone",
};

export default nextConfig;
