import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const skipDirs = new Set(['.git', 'node_modules', '.next', 'dist', 'build', 'coverage']);
const allowedExt = /\.(sql|ts|tsx|js|mjs|cjs|json|ya?ml|env|example)$/i;

function walk(dir, acc) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const relPath = fullPath.slice(root.length + 1).replace(/\\/g, '/');

    if (skipDirs.has(entry) || entry.startsWith('.next-build')) continue;

    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath, acc);
      continue;
    }

    if (allowedExt.test(relPath)) {
      acc.push(relPath);
    }
  }
}

const files = [];
walk(root, files);

const checks = [
  { name: 'Stripe live secret key', regex: /sk_live_[A-Za-z0-9]{16,}/g },
  { name: 'Supabase secret key', regex: /sb_secret_[A-Za-z0-9_\-]{16,}/g },
  { name: 'Stripe webhook secret', regex: /whsec_[A-Za-z0-9]{16,}/g },
  { name: 'Private key block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'Hardcoded SMTP password', regex: /smtp(_|\.)?(pass|password)\s*[=:]\s*['\"][^'\"]{8,}['\"]/gi },
];

const placeholderHints = ['..._tu_', 'example', '<your-', 'changeme', 'placeholder'];
const findings = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, lineIndex) => {
    const normalized = line.toLowerCase();
    const isPlaceholder = placeholderHints.some((hint) => normalized.includes(hint));

    if (isPlaceholder) return;

    for (const check of checks) {
      check.regex.lastIndex = 0;
      if (check.regex.test(line)) {
        findings.push({ file, line: lineIndex + 1, check: check.name, value: line.trim() });
      }
    }
  });
}

if (findings.length > 0) {
  console.error('Secret scan failed. Potential sensitive data detected:\n');
  for (const finding of findings) {
    console.error(`- [${finding.check}] ${finding.file}:${finding.line}`);
    console.error(`  ${finding.value}`);
  }
  process.exit(1);
}

console.log(`Secret scan OK. Checked ${files.length} files.`);
