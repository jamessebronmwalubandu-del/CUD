import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
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
  turbopack: {
    // Pin the workspace root so Next.js doesn't pick up a parent lockfile
    root: path.resolve(__dirname),
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
