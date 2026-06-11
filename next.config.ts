import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel domains are allowed by default
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
