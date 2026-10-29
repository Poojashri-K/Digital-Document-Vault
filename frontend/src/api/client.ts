import axios, { AxiosError } from 'axios';
import { ApiErrorResponse } from '../types';

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // Inject correlation ID if missing
  if (!config.headers['X-Correlation-Id']) {
    config.headers['X-Correlation-Id'] = crypto.randomUUID ? crypto.randomUUID() : 'req-' + Date.now();
  }

  // Inject CSRF token from cookie if available
  const xsrfToken = getCookie('XSRF-TOKEN');
  if (xsrfToken) {
    config.headers['X-XSRF-TOKEN'] = xsrfToken;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    // If session expired and not on login page, prompt or redirect
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      // Session expired
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data?.validationErrors) {
      const firstField = Object.keys(data.validationErrors)[0];
      return `${firstField}: ${data.validationErrors[firstField]}`;
    }
    if (data?.message) {
      return data.message;
    }
    if (error.response?.status === 403) {
      return 'Access denied: You do not have permission for this action.';
    }
    if (error.response?.status === 401) {
      return 'Authentication required or session expired.';
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
