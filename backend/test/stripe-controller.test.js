const test = require('node:test');
const assert = require('node:assert/strict');

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

function loadStripeControllerWithMocks({ user, supabase }) {
  const controllerPath = require.resolve('../src/controllers/stripe.controller');
  const supabasePath = require.resolve('../src/config/supabase');
  const authPath = require.resolve('../src/utils/auth');

  delete require.cache[controllerPath];
  delete require.cache[supabasePath];
  delete require.cache[authPath];

  require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: { supabase },
  };

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
      delete require.cache[controllerPath];
      delete require.cache[supabasePath];
      delete require.cache[authPath];
    },
  };
}

test('createCheckoutSession rejects authenticated users without verified email before payment setup', async () => {
  const supabaseCalls = [];
  const supabase = {
    from(tableName) {
      supabaseCalls.push(tableName);
      throw new Error('Supabase must not be queried before email verification passes.');
    },
  };

  const { controller, cleanup } = loadStripeControllerWithMocks({
    user: {
      id: 'user-without-confirmed-email',
      email_confirmed_at: null,
      confirmed_at: null,
    },
    supabase,
  });

  try {
    const req = {
      body: {
        courseId: '11111111-1111-4111-8111-111111111111',
        returnPath: '/courses/bachazouk-vol-1-tilted-turns',
      },
    };
    const res = createJsonResponseRecorder();

    await controller.createCheckoutSession(req, res);

    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, {
      error: 'Debes verificar tu correo para completar una compra.',
      code: 'email_not_verified',
    });
    assert.deepEqual(supabaseCalls, []);
  } finally {
    cleanup();
  }
});
