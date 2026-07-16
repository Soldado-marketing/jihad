export type ApiHealthReference = {
  endpoint: string;
  method: 'GET';
  purpose: string;
};

export function getApiHealthReference(): ApiHealthReference {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    'http://localhost:3001';

  return {
    endpoint: `${baseUrl.replace(/\/$/, '')}/api/health`,
    method: 'GET',
    purpose:
      'API health check for local and Railway staging readiness; placeholder only until auth integration is connected.',
  };
}
