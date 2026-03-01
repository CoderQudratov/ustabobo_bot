/**
 * Preload script: patches dist/generated/prisma/client.js for CJS before the app loads.
 * Use: NODE_OPTIONS="-r ./scripts/patch-before-run.js" nest start --watch
 */
const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, '../dist/generated/prisma/client.js');
if (fs.existsSync(clientPath)) {
  let content = fs.readFileSync(clientPath, 'utf8');
  if (content.includes('import.meta.url')) {
    content = content.replace(
      /path\.dirname\(\s*\(0,\s*node_url_1\.fileURLToPath\)\s*\(\s*import\.meta\.url\s*\)\s*\)/g,
      'path.dirname(__filename)',
    );
    fs.writeFileSync(clientPath, content);
  }
}
