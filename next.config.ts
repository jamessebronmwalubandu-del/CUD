import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: [
    "pdfkit",
    "quickchart-js",
    "ws",
    "@neondatabase/serverless",
    "@prisma/adapter-neon",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
