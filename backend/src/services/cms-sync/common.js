const DEFAULT_VIDEO_BUCKET = (process.env.SUPABASE_VIDEO_BUCKET || 'course-videos').trim();

function storagePathToVideoUrl(storagePath) {
  return `${DEFAULT_VIDEO_BUCKET}/${storagePath}`;
}

module.exports = {
  storagePathToVideoUrl,
};
