import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  allowedDevOrigins: [
    "*.preview.emergentagent.com",
    "*.emergentagent.com",
    "*.emergentcf.cloud",
    "*.cluster-5.preview.emergentcf.cloud",
    "*.preview.emergentcf.cloud",
    "*.cloudshell.dev",
    "*.emergent.host",
    "web-bugfix-1.cluster-5.preview.emergentcf.cloud",
    "847ed16d-3121-4413-8731-db545c55e2c1.cluster-5.preview.emergentcf.cloud",
    "847ed16d-3121-4413-8731-db545c55e2c1.preview.emergentagent.com",
    "localhost:3000",
  ],
};

export default nextConfig;
