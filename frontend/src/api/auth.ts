import client from './client';
import type { Token } from '../types';

export const authApi = {
    register: (data: { email: string; password: string; full_name?: string }) =>
        client.post('/auth/register', data),
    login: (email: string, password: string) =>
        client.post<Token>(
            '/auth/login',
            new URLSearchParams({ username: email, password }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }
        ),
};
