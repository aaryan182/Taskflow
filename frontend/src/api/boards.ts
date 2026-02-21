import client from './client';
import type { Board, BoardDetail } from '../types';

export const boardsApi = {
    getAll: () => client.get<Board[]>('/boards/'),
    getDetail: (id: string) => client.get<BoardDetail>(`/boards/${id}`),
    create: (data: { title: string; description?: string }) =>
        client.post<BoardDetail>('/boards/', data),
    update: (id: string, data: { title?: string; description?: string }) =>
        client.patch<Board>(`/boards/${id}`, data),
    delete: (id: string) => client.delete(`/boards/${id}`),
};
