const frontendUrl = (process.env.FRONTEND_SMOKE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const backendUrl = (process.env.BACKEND_SMOKE_URL || 'http://localhost:4000').replace(/\/+$/, '');
const cmsUrl = (process.env.CMS_SMOKE_URL || 'http://localhost:1337').replace(/\/+$/, '');

const checks = [
  {
    name: 'frontend home',
    url: `${frontendUrl}/`,
    expectedStatuses: [200],
  },
  {
    name: 'frontend courses',
    url: `${frontendUrl}/courses`,
    expectedStatuses: [200],
  },
  {
    name: 'frontend protected profile',
    url: `${frontendUrl}/profile`,
    expectedStatuses: [302, 303, 307, 308],
  },
  {
    name: 'backend health',
    url: `${backendUrl}/api/health`,
    expectedStatuses: [200],
    validateBody: async (response) => {
      const payload = await response.json();
      if (payload?.status !== 'ok') {
        throw new Error('Backend health response is not ok.');
      }
    },
  },
  {
    name: 'cms admin',
    url: `${cmsUrl}/admin`,
    expectedStatuses: [200],
  },
];

async function runCheck(check) {
  const response = await fetch(check.url, { redirect: 'manual' });

  if (!check.expectedStatuses.includes(response.status)) {
    throw new Error(`${check.name} returned ${response.status}.`);
  }

  if (check.validateBody) {
    await check.validateBody(response);
  }

  console.log(`[smoke] ${check.name}: ${response.status}`);
}

try {
  for (const check of checks) {
    await runCheck(check);
  }

  console.log('[smoke] all local routes passed');
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown smoke check error.';
  console.error(`[smoke] failed: ${message}`);
  process.exit(1);
}
