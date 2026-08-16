import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
};

export default withEve(nextConfig);
