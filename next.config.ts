import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  experimental: {},
  outputFileTracingRoot: path.resolve("."),
};

export default nextConfig;
