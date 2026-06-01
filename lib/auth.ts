import { getEnv } from '@/lib/env';

export const AUTH_COOKIE_NAME = 'shi_dashboard_session';
export const AUTH_COOKIE_VALUE = 'authenticated';

const FALLBACK_USERNAME = 'admin';
const FALLBACK_PASSWORD = 'change-me';

export function getConfiguredCredentials() {
  const env = getEnv();

  return {
    username: env.DASHBOARD_USERNAME ?? FALLBACK_USERNAME,
    password: env.DASHBOARD_PASSWORD ?? FALLBACK_PASSWORD,
  };
}

export function isAuthenticatedValue(value: string | undefined) {
  return value === AUTH_COOKIE_VALUE;
}
