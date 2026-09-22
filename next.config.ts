import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : undefined,
  images: { unoptimized: true },
  allowedDevOrigins: ["127.0.0.1", "192.168.1.15", "192.168.100.15"],
};

export default nextConfig;
