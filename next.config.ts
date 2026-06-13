import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel domains are allowed by default
  serverExternalPackages: ["@neondatabase/serverless", "web-push"],
};

export default nextConfig;
