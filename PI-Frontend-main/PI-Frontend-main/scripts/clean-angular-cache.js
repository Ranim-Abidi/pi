const fs = require('fs');
const path = require('path');

const cacheDir = path.join(process.cwd(), '.angular', 'cache');

try {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log(`[clean-angular-cache] Removed ${cacheDir}`);
} catch (error) {
  console.warn(`[clean-angular-cache] Could not remove ${cacheDir}:`, error.message);
}