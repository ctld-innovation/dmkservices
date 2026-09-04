import path from "node:path";
import type { NextConfig } from "next";

const root = path.resolve(process.cwd());

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "jspdf", "sharp"],
  outputFileTracingRoot: root,
  turbopack: { root },
};

export default nextConfig;
