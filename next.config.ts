import path from "node:path";
import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";

const root = path.resolve(process.cwd());

/**
 * En prod, les URLs deviennent /media-next/_next/static/...
 * (fichiers copiés dans public/ après build). Le handler natif /_next/static
 * renvoie 500 sur le VPS ; public/ fonctionne.
 */
const nextConfig = (phase: string): NextConfig => {
  const isProd =
    phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER;

  return {
    serverExternalPackages: ["@prisma/client", "bcryptjs", "jspdf", "sharp"],
    outputFileTracingRoot: root,
    turbopack: { root },
    assetPrefix: isProd ? "/media-next" : undefined,
  };
};

export default nextConfig;
