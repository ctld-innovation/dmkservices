import path from "node:path";
import type { NextConfig } from "next";

const root = path.resolve(__dirname);

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "jspdf", "sharp"],
  // Un lockfile parent (/home/ubuntu) faisait écrire CSS/chunks hors du projet.
  outputFileTracingRoot: root,
  turbopack: { root },
};

export default nextConfig;
