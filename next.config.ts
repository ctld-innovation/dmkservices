import path from "node:path";
import type { NextConfig } from "next";

const root = path.resolve(process.cwd());
const isProd = process.env.NODE_ENV === "production";

/**
 * En prod, les URLs d'assets pointent vers /media-next/_next/static/...
 * (fichiers copiés dans public/ après le build). Ça contourne le handler
 * cassé de Next sur /_next/static (500) — public/ est déjà servi correctement.
 */
const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "jspdf", "sharp"],
  outputFileTracingRoot: root,
  turbopack: { root },
  assetPrefix: isProd ? "/media-next" : undefined,
};

export default nextConfig;
