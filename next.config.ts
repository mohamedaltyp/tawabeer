import type { NextConfig } from "next";

const nextConfig: NextConfig = {
<<<<<<< HEAD
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.io",
  ],
=======
  // Vercel domains are allowed by default
  serverExternalPackages: ["@neondatabase/serverless"],
>>>>>>> 950f47a91a6abddc2e5ad58f7ab5dc80aafb1e92
};

export default nextConfig;
