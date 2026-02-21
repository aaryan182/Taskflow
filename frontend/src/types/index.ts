export interface User {
    id: string;
    email: string;
    full_name: string | null;
}

export interface Card {
    id: string;
    title: string;
    description: string | null;
    rank: string;
    list_id: string;
    created_at: string;
}

export interface List {
    id: string;
    title: string;
    rank: string;
    board_id: string;
    cards: Card[];
}

export interface Board {
    id: string;
    title: string;
    description: string | null;
    owner_id: string;
    created_at: string;
}

export interface BoardDetail extends Board {
    lists: List[];
}

export interface MoveCardPayload {
    list_id: string;
    before_rank: string | null;
    after_rank: string | null;
}

export interface Token {
    access_token: string;
    token_type: string;
}
