import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use((config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  });
}