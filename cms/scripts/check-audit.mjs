#!/usr/bin/env node
// Fails on any high/critical npm advisory except the reviewed exceptions below.
//
// Every exception must name the exact advisory and the exact install paths it
// is accepted for. If a new path or a new advisory appears, CI fails again.
// Review this list on every Strapi upgrade and delete entries once upstream
// ships a fix.
import { execFileSync } from 'node:child_process';

const BLOCKING_SEVERITIES = new Set(['high', 'critical']);

const REVIEWED_EXCEPTIONS = [
  {
    advisory: 'GHSA-mrhx-c7xc-m3w5',
    nodes: ['node_modules/koa-body/node_modules/zod', 'node_modules/koa-session/node_modules/zod'],
    reason:
      'zod 3 is pinned by koa-session@7 (latest) and koa-body@6 inside @strapi/core. ' +
      'koa-session only parses its own static options and koa-body only imports zod types, ' +
      'so no user input reaches it. Forcing zod 4 breaks koa-session (z.function().args()).',
  },
  {
    advisory: 'GHSA-g84c-rxfj-3j2c',
    nodes: ['node_modules/webpack-dev-middleware'],
    reason:
      'Only loaded by `strapi develop --bundler=webpack`. This project builds and develops ' +
      'with the default Vite bundler, and production runs `strapi start` without a dev server.',
  },
];

function runAudit() {
  try {
    return execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    // npm audit exits non-zero when it finds vulnerabilities; the JSON is still on stdout.
    if (error.stdout) return error.stdout;
    throw error;
  }
}

function advisoryId(url) {
  return String(url || '').split('/').pop();
}

const report = JSON.parse(runAudit());
const failures = [];
const accepted = [];

for (const [name, vulnerability] of Object.entries(report.vulnerabilities || {})) {
  for (const via of vulnerability.via || []) {
    // String entries are transitive references; the advisory itself is checked on its own package.
    if (typeof via === 'string' || !BLOCKING_SEVERITIES.has(via.severity)) continue;

    const id = advisoryId(via.url);
    const exception = REVIEWED_EXCEPTIONS.find((entry) => entry.advisory === id);
    const unexpectedNodes = exception
      ? (vulnerability.nodes || []).filter((node) => !exception.nodes.includes(node))
      : vulnerability.nodes || [];

    if (exception && unexpectedNodes.length === 0) {
      accepted.push(`${name} ${id}`);
    } else {
      failures.push(`${via.severity.toUpperCase()} ${name} ${id} (${via.title}) at ${unexpectedNodes.join(', ')}`);
    }
  }
}

for (const entry of [...new Set(accepted)]) {
  console.log(`Accepted reviewed exception: ${entry}`);
}

if (failures.length > 0) {
  console.error('Blocking npm advisories found:');
  for (const failure of [...new Set(failures)]) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('No blocking npm advisories outside the reviewed exceptions.');
