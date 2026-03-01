/**
 * Patches dist/generated/prisma/client.js so it runs in CommonJS:
 * replaces "import.meta.url" with __filename so Node does not treat the file as ESM.
 */
const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, '../dist/generated/prisma/client.js');
if (!fs.existsSync(clientPath)) {
  console.warn('fix-prisma-client: dist/generated/prisma/client.js not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(clientPath, 'utf8');
if (!content.includes('import.meta.url')) {
  console.log('fix-prisma-client: no patch needed');
  process.exit(0);
}
// CJS equivalent of path.dirname(fileURLToPath(import.meta.url)) is path.dirname(__filename)
content = content.replace(
  /path\.dirname\(\s*\(0,\s*node_url_1\.fileURLToPath\)\s*\(\s*import\.meta\.url\s*\)\s*\)/g,
  'path.dirname(__filename)',
);
fs.writeFileSync(clientPath, content);
console.log('fix-prisma-client: patched client.js for CJS');
