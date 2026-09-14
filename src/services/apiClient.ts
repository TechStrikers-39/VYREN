import { APP_CONFIG } from '@/config/appConfig';

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem(APP_CONFIG.tokenKey);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${APP_CONFIG.apiBaseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        errorMessage = typeof errorData.detail === 'string'
          ? errorData.detail
          : JSON.stringify(errorData.detail);
      }
    } catch {
      // Use default status text if JSON parse fails
    }

    if (response.status === 401) {
      localStorage.removeItem(APP_CONFIG.tokenKey);
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}
