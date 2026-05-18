process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'local-test-service-role-key';
process.env.SUPABASE_VIDEO_BUCKET ||= 'course-videos';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveHlsStorageReference,
  resolveStorageReference,
  rewriteHlsManifest,
} = require('../src/services/video-storage.service');

test('resolveStorageReference accepts expected private video paths', () => {
  assert.deepEqual(resolveStorageReference('course/intro.mp4'), {
    bucket: 'course-videos',
    path: 'course/intro.mp4',
  });
  assert.deepEqual(resolveStorageReference('course-videos/course/intro.mp4'), {
    bucket: 'course-videos',
    path: 'course/intro.mp4',
  });
  assert.deepEqual(resolveStorageReference('course-videos:course/intro.mp4'), {
    bucket: 'course-videos',
    path: 'course/intro.mp4',
  });
});

test('resolveStorageReference rejects ambiguous or unsafe object paths', () => {
  assert.equal(resolveStorageReference('course/../intro.mp4'), null);
  assert.equal(resolveStorageReference('course//intro.mp4'), null);
  assert.equal(resolveStorageReference('course\\intro.mp4'), null);
  assert.equal(resolveStorageReference('course/%2e%2e/intro.mp4'), null);
  assert.equal(resolveStorageReference('https://example.com/video.mp4'), null);
  assert.equal(resolveStorageReference('other-bucket:course/intro.mp4'), null);
});

test('resolveHlsStorageReference keeps resource paths inside the HLS root', () => {
  const rootReference = { bucket: 'course-videos', path: 'course/hls/master.m3u8' };

  assert.deepEqual(resolveHlsStorageReference(rootReference, 'segments/0001.ts'), {
    bucket: 'course-videos',
    path: 'course/hls/segments/0001.ts',
  });

  assert.equal(resolveHlsStorageReference(rootReference, '../private/key.bin'), null);
  assert.equal(resolveHlsStorageReference(rootReference, '/segments/0001.ts'), null);
  assert.equal(resolveHlsStorageReference(rootReference, 'segments/%2e%2e/key.bin'), null);
});

test('rewriteHlsManifest rewrites safe HLS URIs and blocks external attributes', () => {
  const rootReference = { bucket: 'course-videos', path: 'course/hls/master.m3u8' };
  const currentReference = { bucket: 'course-videos', path: 'course/hls/master.m3u8' };
  const manifest = [
    '#EXTM3U',
    '#EXT-X-KEY:METHOD=AES-128,URI="https://cdn.example.com/key.bin"',
    '#EXTINF:4.0,',
    'segments/0001.ts',
    'https://cdn.example.com/segment.ts',
  ].join('\n');

  const rewritten = rewriteHlsManifest({
    manifestText: manifest,
    rootReference,
    currentReference,
    rawToken: 'token.value',
  });

  assert.match(rewritten, /URI="blocked-external-hls-uri"/);
  assert.match(
    rewritten,
    /\/api\/lessons\/hls\/token\.value\/resource\?path=segments%2F0001\.ts/
  );
  assert.match(rewritten, /# blocked external HLS URI/);
  assert.doesNotMatch(rewritten, /https:\/\/cdn\.example\.com/);
});
