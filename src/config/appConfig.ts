export const APP_CONFIG = {
  apiBaseUrl: (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000',
  tokenKey: 'vyren_access_token',
};
