import path from "node:path";
import type { NextConfig } from "next";

/** process.cwd() = répertoire d'où on lance build/start (évite un __dirname
 *  incorrect si next.config.ts est compilé ailleurs). */
const root = path.resolve(process.cwd());

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "jspdf", "sharp"],
  outputFileTracingRoot: root,
  turbopack: { root },
};

export default nextConfig;
