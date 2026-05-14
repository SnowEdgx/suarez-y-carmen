const { supabase } = require('../config/supabase');
const { hashRequestValue } = require('./video-device.service');
const { getClientIp, getUserAgent } = require('../utils/request');
const { sanitizeRangeHeader } = require('../utils/range-header');

async function recordPlaybackEvent({
  req,
  lesson,
  lessonId,
  courseId,
  userId,
  tokenNonce,
  eventType,
  statusCode,
  errorCode,
}) {
  const { error } = await supabase
    .from('video_playback_events')
    .insert({
      user_id: userId || null,
      course_id: courseId || lesson?.course_id || null,
      lesson_id: lessonId || lesson?.id || null,
      token_nonce: tokenNonce || null,
      event_type: eventType,
      status_code: statusCode || null,
      request_ip_hash: hashRequestValue(getClientIp(req)),
      user_agent_hash: hashRequestValue(getUserAgent(req)),
      range_header: sanitizeRangeHeader(req.headers.range),
      error_code: errorCode || null,
    });

  if (error) throw error;
}

function recordPlaybackEventSafe(event) {
  recordPlaybackEvent(event).catch((error) => {
    console.warn('[Playback Audit Service] Playback audit write failed:', error.message);
  });
}

module.exports = {
  recordPlaybackEvent,
  recordPlaybackEventSafe,
};
