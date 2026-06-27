import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.jakawi.com",
      },
    ],
  },
};

export default nextConfig;
