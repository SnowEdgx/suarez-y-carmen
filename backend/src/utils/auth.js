const { supabase } = require('../config/supabase');
const { getBearerToken } = require('./request');

async function getAuthenticatedUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
}

function isEmailVerified(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

module.exports = {
  getAuthenticatedUser,
  isEmailVerified,
};
