'use strict';

const DEFAULT_UPLOAD_SIZE_LIMIT = 25 * 1024 * 1024;

function getLocalUploadConfig() {
  return {
    config: {
      sizeLimit: DEFAULT_UPLOAD_SIZE_LIMIT,
    },
  };
}

function requireEnv(env, name) {
  const value = env(name);
  if (!value) {
    throw new Error(`${name} is required when UPLOAD_PROVIDER=aws-s3.`);
  }

  return value;
}

function getS3UploadConfig(env) {
  return {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        baseUrl: env('UPLOAD_S3_BASE_URL', undefined),
        rootPath: env('UPLOAD_S3_ROOT_PATH', undefined),
        s3Options: {
          credentials: {
            accessKeyId: requireEnv(env, 'UPLOAD_S3_ACCESS_KEY_ID'),
            secretAccessKey: requireEnv(env, 'UPLOAD_S3_SECRET_ACCESS_KEY'),
          },
          region: requireEnv(env, 'UPLOAD_S3_REGION'),
          endpoint: env('UPLOAD_S3_ENDPOINT', undefined),
          forcePathStyle: env.bool('UPLOAD_S3_FORCE_PATH_STYLE', false),
          params: {
            Bucket: requireEnv(env, 'UPLOAD_S3_BUCKET'),
          },
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
      sizeLimit: env.int('UPLOAD_SIZE_LIMIT_BYTES', DEFAULT_UPLOAD_SIZE_LIMIT),
    },
  };
}

module.exports = ({ env }) => ({
  upload: env('UPLOAD_PROVIDER', 'local') === 'aws-s3'
    ? getS3UploadConfig(env)
    : getLocalUploadConfig(),
});
