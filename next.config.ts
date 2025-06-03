import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Prevents build from failing due to ESLint errors
  },
};

export default nextConfig;
