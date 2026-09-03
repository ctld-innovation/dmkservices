import path from "node:path";
import type { NextConfig } from "next";

/** Un lockfile parent (/home/ubuntu) faisait écrire CSS/chunks hors du projet
 *  et provoquait des 500 sur /_next/static. */
const root = path.resolve(__dirname);

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "jspdf", "sharp"],
  outputFileTracingRoot: root,
  turbopack: { root },
};

export default nextConfig;
