const test = require('node:test');
const assert = require('node:assert/strict');

const VALID_TOKEN = '11111111-1111-4111-8111-111111111111';
const VERIFIED_USER = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'alumno@example.test',
  email_confirmed_at: '2026-05-01T10:00:00.000Z',
};

function createJsonResponseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

// Minimal in-memory stand-in for the account_deletion_tokens table.
function createFakeSupabase({ rows = [], deleteUserError = null } = {}) {
  const state = { rows: rows.map((row) => ({ ...row })), deletedUsers: [] };

  function query() {
    const filters = [];
    let operation = 'select';
    let payload = null;

    const matches = (row) => filters.every((filter) => filter(row));
    const builder = {
      select() {
        return builder;
      },
      delete() {
        operation = 'delete';
        return builder;
      },
      insert(row) {
        operation = 'insert';
        payload = row;
        return builder;
      },
      eq(column, value) {
        filters.push((row) => row[column] === value);
        return builder;
      },
      gte(column, value) {
        filters.push((row) => row[column] >= value);
        return builder;
      },
      lt(column, value) {
        filters.push((row) => row[column] < value);
        return builder;
      },
      limit() {
        return builder;
      },
      maybeSingle() {
        const found = state.rows.find(matches) || null;
        return Promise.resolve({ data: found, error: null });
      },
      then(resolve, reject) {
        let result;
        if (operation === 'insert') {
          state.rows.push({ created_at: new Date().toISOString(), ...payload });
          result = { data: null, error: null };
        } else if (operation === 'delete') {
          state.rows = state.rows.filter((row) => !matches(row));
          result = { data: null, error: null };
        } else {
          result = { data: state.rows.filter(matches), error: null };
        }
        return Promise.resolve(result).then(resolve, reject);
      },
    };

    return builder;
  }

  return {
    state,
    client: {
      from(tableName) {
        assert.equal(tableName, 'account_deletion_tokens');
        return query();
      },
      auth: {
        admin: {
          async deleteUser(userId) {
            state.deletedUsers.push(userId);
            return { error: deleteUserError };
          },
        },
      },
    },
  };
}

function loadUserController({ user, supabase }) {
  const controllerPath = require.resolve('../src/controllers/user.controller');
  const supabasePath = require.resolve('../src/config/supabase');
  const authPath = require.resolve('../src/utils/auth');

  for (const modulePath of [controllerPath, supabasePath, authPath]) {
    delete require.cache[modulePath];
  }

  require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: { supabase } };
  require.cache[authPath] = {
    id: authPath,
    filename: authPath,
    loaded: true,
    exports: {
      getAuthenticatedUser: async () => user,
      isEmailVerified: (authUser) => Boolean(authUser?.email_confirmed_at || authUser?.confirmed_at),
    },
  };

  return {
    controller: require(controllerPath),
    cleanup() {
      for (const modulePath of [controllerPath, supabasePath, authPath]) {
        delete require.cache[modulePath];
      }
    },
  };
}

async function withEnv(values, callback) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    return await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function withFetch(fakeFetch, callback) {
  const originalFetch = global.fetch;
  global.fetch = fakeFetch;
  try {
    return await callback();
  } finally {
    global.fetch = originalFetch;
  }
}

const MAIL_ENV = {
  RESEND_API_KEY: 'test-resend-key',
  FRONTEND_URL: 'https://academia.example.test',
  NODE_ENV: 'test',
};

test('requestDeleteAccount rejects users without a verified email before touching tokens', async () => {
  const fake = createFakeSupabase();
  const { controller, cleanup } = loadUserController({
    user: { ...VERIFIED_USER, email_confirmed_at: null },
    supabase: fake.client,
  });

  try {
    const res = createJsonResponseRecorder();
    await controller.requestDeleteAccount({}, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'email_not_verified');
    assert.equal(fake.state.rows.length, 0);
  } finally {
    cleanup();
  }
});

test('requestDeleteAccount does not create tokens when email delivery is not configured', async () => {
  const fake = createFakeSupabase();
  const { controller, cleanup } = loadUserController({ user: VERIFIED_USER, supabase: fake.client });

  try {
    await withEnv({ ...MAIL_ENV, RESEND_API_KEY: undefined }, async () => {
      const res = createJsonResponseRecorder();
      await controller.requestDeleteAccount({}, res);

      assert.equal(res.statusCode, 503);
      assert.equal(res.body.code, 'email_unavailable');
      assert.equal(fake.state.rows.length, 0);
    });
  } finally {
    cleanup();
  }
});

test('requestDeleteAccount replaces previous tokens, purges expired ones and emails a link to the frontend', async () => {
  const oldCreatedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const fake = createFakeSupabase({
    rows: [
      // Previous valid link for the same user: must be invalidated.
      {
        token: '33333333-3333-4333-8333-333333333333',
        user_id: VERIFIED_USER.id,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        created_at: oldCreatedAt,
      },
      // Expired link of another user: must be purged.
      {
        token: '44444444-4444-4444-8444-444444444444',
        user_id: '55555555-5555-4555-8555-555555555555',
        expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
        created_at: oldCreatedAt,
      },
    ],
  });
  const { controller, cleanup } = loadUserController({ user: VERIFIED_USER, supabase: fake.client });
  const sentEmails = [];

  try {
    await withEnv(MAIL_ENV, () =>
      withFetch(async (url, options) => {
        sentEmails.push({ url, body: JSON.parse(options.body) });
        return { ok: true, status: 200, text: async () => '' };
      }, async () => {
        const res = createJsonResponseRecorder();
        await controller.requestDeleteAccount({}, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
      })
    );

    assert.equal(fake.state.rows.length, 1);
    const [activeToken] = fake.state.rows;
    assert.equal(activeToken.user_id, VERIFIED_USER.id);
    assert.notEqual(activeToken.token, '33333333-3333-4333-8333-333333333333');

    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].url, 'https://api.resend.com/emails');
    assert.deepEqual(sentEmails[0].body.to, [VERIFIED_USER.email]);
    assert.match(
      sentEmails[0].body.html,
      new RegExp(`https://academia\\.example\\.test/auth/delete-account\\?token=${activeToken.token}`)
    );
  } finally {
    cleanup();
  }
});

test('requestDeleteAccount enforces a per-account cooldown between emails', async () => {
  const fake = createFakeSupabase({
    rows: [
      {
        token: '33333333-3333-4333-8333-333333333333',
        user_id: VERIFIED_USER.id,
        expires_at: new Date(Date.now() + 59 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 30 * 1000).toISOString(),
      },
    ],
  });
  const { controller, cleanup } = loadUserController({ user: VERIFIED_USER, supabase: fake.client });

  try {
    await withEnv(MAIL_ENV, () =>
      withFetch(async () => {
        throw new Error('No email should be sent during the cooldown.');
      }, async () => {
        const res = createJsonResponseRecorder();
        await controller.requestDeleteAccount({}, res);

        assert.equal(res.statusCode, 429);
        assert.equal(res.body.code, 'deletion_recently_requested');
      })
    );

    assert.equal(fake.state.rows.length, 1);
  } finally {
    cleanup();
  }
});

test('requestDeleteAccount removes the token when the email provider fails', async () => {
  const fake = createFakeSupabase();
  const { controller, cleanup } = loadUserController({ user: VERIFIED_USER, supabase: fake.client });

  try {
    await withEnv(MAIL_ENV, () =>
      withFetch(async () => ({ ok: false, status: 500, text: async () => 'provider down' }), async () => {
        const res = createJsonResponseRecorder();
        await controller.requestDeleteAccount({}, res);

        assert.equal(res.statusCode, 502);
        assert.equal(res.body.code, 'email_send_failed');
      })
    );

    assert.equal(fake.state.rows.length, 0);
  } finally {
    cleanup();
  }
});

test('confirmDeleteAccount rejects malformed and unknown tokens without deleting users', async () => {
  const fake = createFakeSupabase();
  const { controller, cleanup } = loadUserController({ user: null, supabase: fake.client });

  try {
    const malformed = createJsonResponseRecorder();
    await controller.confirmDeleteAccount({ body: { token: 'not-a-uuid' } }, malformed, assert.fail);
    assert.equal(malformed.statusCode, 400);
    assert.equal(malformed.body.code, 'invalid_token');

    const unknown = createJsonResponseRecorder();
    await controller.confirmDeleteAccount({ body: { token: VALID_TOKEN } }, unknown, assert.fail);
    assert.equal(unknown.statusCode, 400);
    assert.equal(unknown.body.code, 'invalid_token');

    assert.deepEqual(fake.state.deletedUsers, []);
  } finally {
    cleanup();
  }
});

test('confirmDeleteAccount rejects and removes expired tokens', async () => {
  const fake = createFakeSupabase({
    rows: [
      {
        token: VALID_TOKEN,
        user_id: VERIFIED_USER.id,
        expires_at: new Date(Date.now() - 1000).toISOString(),
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ],
  });
  const { controller, cleanup } = loadUserController({ user: null, supabase: fake.client });

  try {
    const res = createJsonResponseRecorder();
    await controller.confirmDeleteAccount({ body: { token: VALID_TOKEN } }, res, assert.fail);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'expired_token');
    assert.equal(fake.state.rows.length, 0);
    assert.deepEqual(fake.state.deletedUsers, []);
  } finally {
    cleanup();
  }
});

test('confirmDeleteAccount deletes the user that owns a valid token', async () => {
  const fake = createFakeSupabase({
    rows: [
      {
        token: VALID_TOKEN,
        user_id: VERIFIED_USER.id,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      },
    ],
  });
  const { controller, cleanup } = loadUserController({ user: null, supabase: fake.client });

  try {
    const res = createJsonResponseRecorder();
    await controller.confirmDeleteAccount({ body: { token: VALID_TOKEN } }, res, assert.fail);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(fake.state.deletedUsers, [VERIFIED_USER.id]);
  } finally {
    cleanup();
  }
});
