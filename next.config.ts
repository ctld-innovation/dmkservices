import path from "node:path";
import type { NextConfig } from "next";

/** Force la racine du projet (un lockfile orphelin dans /home/ubuntu
 *  faisait mal détecter le workspace). */
const root = path.resolve(process.cwd());

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "jspdf", "sharp"],
  outputFileTracingRoot: root,
  turbopack: { root },
};

export default nextConfig;
