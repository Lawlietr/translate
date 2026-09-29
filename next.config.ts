import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: process.env.NEXT_BASE_PATH || "",
  allowedDevOrigins: ["127.0.0.1", "192.168.1.15", "192.168.100.15"],
};

export default nextConfig;
