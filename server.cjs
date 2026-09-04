/**
 * Serveur prod : sert .next/static depuis le disque avant Next.
 * Contourne les 500 du handler natif /_next/static.
 */
process.env.TURBOPACK = "";

const { createServer } = require("node:http");
const { parse } = require("node:url");
const { createReadStream, existsSync, readdirSync, statSync } = require("node:fs");
const { join, extname, normalize, sep } = require("node:path");
const next = require("next");

// Toujours le dossier du projet (pas un cwd / .next parent parasite).
const dir = __dirname;
const staticRoot = join(dir, ".next", "static");
const hostname = process.env.HOSTNAME || "127.0.0.1";
const port = Number(process.env.PORT || 3003);

const MIME = {
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
};

function countCss(root) {
  if (!existsSync(root)) return 0;
  let n = 0;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (name.endsWith(".css")) n += 1;
    }
  };
  walk(root);
  return n;
}

function safeStaticPath(urlPath) {
  const prefix = "/_next/static/";
  if (!urlPath.startsWith(prefix)) return null;
  const rel = urlPath.slice(prefix.length);
  if (!rel || rel.includes("\0")) return null;
  const resolved = normalize(join(staticRoot, rel));
  if (resolved !== staticRoot && !resolved.startsWith(staticRoot + sep)) return null;
  return resolved;
}

if (!existsSync(staticRoot)) {
  console.error(`==> ERREUR : ${staticRoot} introuvable — lancez npm run build`);
  process.exit(1);
}

console.log(`==> dir=${dir}`);
console.log(`==> static=${staticRoot} (css=${countCss(staticRoot)})`);

const app = next({ dev: false, hostname, port, dir });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = createServer(async (req, res) => {
      try {
        const parsed = parse(req.url || "/", true);
        const pathname = parsed.pathname || "/";
        const file = safeStaticPath(pathname);
        if (file && existsSync(file) && statSync(file).isFile()) {
          const type = MIME[extname(file).toLowerCase()] || "application/octet-stream";
          res.writeHead(200, {
            "Content-Type": type,
            "Cache-Control": "public, max-age=31536000, immutable",
          });
          createReadStream(file).pipe(res);
          return;
        }
        await handle(req, res, parsed);
      } catch (err) {
        console.error("[server]", err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      }
    });

    server.on("error", (err) => {
      console.error(`==> ERREUR listen :${port}`, err);
      process.exit(1);
    });

    server.listen(port, hostname, () => {
      console.log(`==> Ready on http://${hostname}:${port} (pid ${process.pid})`);
    });
  })
  .catch((err) => {
    console.error("Failed to prepare Next app", err);
    process.exit(1);
  });
