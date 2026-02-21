import client from './client';
import type { List } from '../types';

interface ListCreatePayload {
    title: string;
    board_id: string;
    after_rank?: string | null;
}

export const listsApi = {
    create: (data: ListCreatePayload) =>
        client.post<List>('/lists/', data),
    update: (listId: string, data: { title?: string }) =>
        client.patch<List>(`/lists/${listId}`, data),
    delete: (listId: string) => client.delete(`/lists/${listId}`),
};
