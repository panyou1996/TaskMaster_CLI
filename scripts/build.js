const fs = require('fs');
const path = require('path');
const { build } = require('esbuild');

function ensurePublic() {
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
  ensurePublic();

  await build({
    entryPoints: [path.join(process.cwd(), 'index.tsx')],
    bundle: true,
    outfile: path.join(process.cwd(), 'public', 'index.js'),
    loader: { '.tsx': 'tsx' },
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.API_KEY': '"' + (process.env.API_KEY || '') + '"',
    },
    minify: true,
  });

  console.log('Build complete. Files written to public/');
})();
