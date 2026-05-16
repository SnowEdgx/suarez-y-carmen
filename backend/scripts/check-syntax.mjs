import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const checkRoots = ['src', 'scripts'].map((root) => path.join(projectRoot, root));
const validExtensions = new Set(['.js', '.mjs']);

function collectJavaScriptFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...collectJavaScriptFiles(fullPath));
      continue;
    }

    if (stats.isFile() && validExtensions.has(path.extname(entry))) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = checkRoots.flatMap(collectJavaScriptFiles).sort();

for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

console.log(`Checked ${files.length} backend JavaScript files.`);
