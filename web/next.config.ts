import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  allowedDevOrigins: [
    "3000-cs-340912351632-default.cs-asia-southeast1-fork.cloudshell.dev",
    "8080-cs-340912351632-default.cs-asia-southeast1-fork.cloudshell.dev",
    "847ed16d-3121-4413-8731-db545c55e2c1.preview.emergentagent.com",
    "847ed16d-3121-4413-8731-db545c55e2c1.cluster-5.preview.emergentcf.cloud",
    "*.preview.emergentagent.com",
    "*.emergentagent.com",
    "*.emergentcf.cloud",
  ],
};

export default nextConfig;
