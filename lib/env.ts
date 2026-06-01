import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_BASE_URL: z.string().optional(),
  DASHBOARD_USERNAME: z.string().optional(),
  DASHBOARD_PASSWORD: z.string().optional(),
  REVIEWER_EMAIL: z.string().email().optional(),
  DATABASE_FILE: z.string().optional(),
  STORAGE_DRIVER: z.enum(['local', 's3']).optional(),
  STORAGE_LOCAL_DIR: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_FORCE_PATH_STYLE: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().optional(),
  SMTP_FROM_NAME: z.string().optional(),
  IMAP_HOST: z.string().optional(),
  IMAP_PORT: z.string().optional(),
  IMAP_SECURE: z.string().optional(),
  IMAP_USER: z.string().optional(),
  IMAP_PASSWORD: z.string().optional(),
  IMAP_MAILBOX: z.string().optional(),
  IMAP_LOOKBACK_LIMIT: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  CONTENT_PROVIDER: z.enum(['mock', 'openai']).optional(),
  SCHEDULER_SECRET: z.string().optional(),
  SH_ARABIC_FONT_FILE: z.string().optional(),
  SH_LOGO_URL: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}

export function getAppBaseUrl() {
  const env = getEnv();

  if (env.APP_BASE_URL) {
    return env.APP_BASE_URL.replace(/\/+$/, '');
  }

  return 'http://localhost:3000';
}

export function getStorageDriver() {
  const env = getEnv();

  if (env.STORAGE_DRIVER) {
    return env.STORAGE_DRIVER;
  }

  return env.STORAGE_BUCKET ? 's3' : 'local';
}

export function isS3Configured() {
  const env = getEnv();

  return Boolean(
    env.STORAGE_BUCKET &&
      env.STORAGE_REGION &&
      env.STORAGE_ACCESS_KEY_ID &&
      env.STORAGE_SECRET_ACCESS_KEY,
  );
}

export function isSmtpConfigured() {
  const env = getEnv();

  return Boolean(
    env.SMTP_HOST &&
      env.SMTP_PORT &&
      env.SMTP_USER &&
      env.SMTP_PASSWORD &&
      env.SMTP_FROM_EMAIL,
  );
}

export function isImapConfigured() {
  const env = getEnv();

  return Boolean(
    env.IMAP_HOST &&
      env.IMAP_PORT &&
      env.IMAP_USER &&
      env.IMAP_PASSWORD,
  );
}

export function getContentProvider() {
  const env = getEnv();

  if (env.CONTENT_PROVIDER) {
    return env.CONTENT_PROVIDER;
  }

  return env.OPENAI_API_KEY ? 'openai' : 'mock';
}

export function getReadinessSnapshot() {
  const env = getEnv();

  return {
    smtp: isSmtpConfigured(),
    imap: isImapConfigured(),
    storage: getStorageDriver() === 's3' ? isS3Configured() : true,
    content: getContentProvider() === 'mock' || Boolean(env.OPENAI_API_KEY),
    reviewer: Boolean(env.REVIEWER_EMAIL),
    scheduler: Boolean(env.SCHEDULER_SECRET),
    storageDriver: getStorageDriver(),
  };
}
