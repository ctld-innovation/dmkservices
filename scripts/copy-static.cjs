#!/usr/bin/env node
/**
 * Copie .next/static → public/media-next/_next/static
 * pour que les assets (assetPrefix=/media-next) soient servis comme fichiers public.
 */
const { cpSync, existsSync, mkdirSync, rmSync } = require("node:fs");
const { join } = require("node:path");

const root = process.cwd();
const src = join(root, ".next", "static");
const destRoot = join(root, "public", "media-next", "_next");
const dest = join(destRoot, "static");

if (!existsSync(src)) {
  console.error("copy-static: .next/static introuvable — lancez next build d'abord");
  process.exit(1);
}

rmSync(join(root, "public", "media-next"), { recursive: true, force: true });
mkdirSync(destRoot, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("copy-static: OK → public/media-next/_next/static");
