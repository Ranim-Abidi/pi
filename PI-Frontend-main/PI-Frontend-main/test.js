const { execSync } = require('child_process');
try {
  execSync('npx ng build', { stdio: 'pipe' });
} catch (e) {
  let err = e.stdout.toString() + e.stderr.toString();
  err = err.replace(/\x1b\[[0-9;]*m/g, ''); // strip colors
  require('fs').writeFileSync('clean_err.log', err);
}
