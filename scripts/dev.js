const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const http = require('http');

async function ensurePublic() {
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const filesToCopy = ['index.html', 'manifest.json', 'sw.js', 'icon.svg'];
  filesToCopy.forEach((f) => {
    const src = path.join(__dirname, '..', f);
    const dest = path.join(publicDir, path.basename(f));
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  });

  const capSrc = path.join(__dirname, '..', 'capacitor.js');
  const capDest = path.join(publicDir, 'capacitor.js');
  if (fs.existsSync(capSrc)) fs.copyFileSync(capSrc, capDest);
}

(async () => {
  await ensurePublic();

  const ctx = await esbuild.context({
    entryPoints: [path.join(process.cwd(), 'index.tsx')],
    bundle: true,
    outfile: path.join(process.cwd(), 'public', 'index.js'),
    loader: { '.tsx': 'tsx' },
    define: {
      'process.env.NODE_ENV': '"development"',
      'process.env.API_KEY': '"' + (process.env.API_KEY || '') + '"',
    },
    sourcemap: true,
    write: true,
  });

  await ctx.watch();

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  // Simple static file server for the public directory
  const publicDir = path.join(process.cwd(), 'public');
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(publicDir, decodeURIComponent(reqPath));
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      // set a basic Content-Type header based on file extension to avoid
      // the browser rejecting module scripts with an empty MIME type.
      const ext = path.extname(filePath).toLowerCase();
      const map = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.ico': 'image/x-icon',
        '.wasm': 'application/wasm'
      };
      const contentType = map[ext] || 'application/octet-stream';
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      // small cache for dev convenience
      res.setHeader('Cache-Control', 'no-store');
      res.end(data);
    });
  });

  server.listen(port, () => {
    console.log(`Dev server running at http://localhost:${port}`);
  });

  // keep process alive and expose a way to stop
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    server.close();
    try { await ctx.dispose(); } catch (e) {}
    process.exit(0);
  });
})();
