import client from './client';
import type { Card, MoveCardPayload } from '../types';

export const cardsApi = {
    create: (data: { title: string; list_id: string; board_id: string }) =>
        client.post<Card>('/cards/', data),
    update: (cardId: string, data: { title?: string; description?: string }) =>
        client.patch<Card>(`/cards/${cardId}`, data),
    move: (cardId: string, payload: MoveCardPayload) =>
        client.post<Card>(`/cards/${cardId}/move`, payload),
    delete: (cardId: string) => client.delete(`/cards/${cardId}`),
};
