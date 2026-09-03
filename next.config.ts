import path from "node:path";
import type { NextConfig } from "next";

const root = path.resolve(process.cwd());

/** Préfixe forcé au build via NEXT_ASSET_PREFIX=/media-next (voir package.json). */
const assetPrefix = process.env.NEXT_ASSET_PREFIX || undefined;

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "jspdf", "sharp"],
  outputFileTracingRoot: root,
  turbopack: { root },
  assetPrefix,
};

export default nextConfig;
