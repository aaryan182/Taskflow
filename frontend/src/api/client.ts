import axios from 'axios';

const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor: add auth token
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor: handle 401 (skip auth endpoints to avoid redirect loops)
client.interceptors.response.use(
    (response) => response,
    (error) => {
        const requestUrl = error.config?.url || '';
        const isAuthEndpoint =
            requestUrl.includes('/auth/login') ||
            requestUrl.includes('/auth/register');

        if (error.response?.status === 401 && !isAuthEndpoint) {
            localStorage.removeItem('token');
            // Dispatch a custom event so React can handle the logout gracefully
            // instead of a hard page reload which causes the sign-in loop
            window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(error);
    }
);

export default client;
