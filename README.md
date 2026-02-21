# TaskFlow

A production grade Kanban board application built with FastAPI, React and PostgreSQL.
Features drag and drop card management, LexoRank ordering, optimistic UI updates with rollback and concurrency safe card moves via row level locking.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Architecture](#system-architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [File-by-File Breakdown](#file-by-file-breakdown)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Code Flow: Full Request Lifecycle](#code-flow-full-request-lifecycle)
9. [Ordering Algorithm: LexoRank](#ordering-algorithm-lexorank)
10. [Race Condition Handling](#race-condition-handling)
11. [Optimistic UI and Rollback](#optimistic-ui-and-rollback)
12. [N+1 Query Prevention](#n1-query-prevention)
13. [Soft Delete Cascade](#soft-delete-cascade)
14. [Authentication Flow](#authentication-flow)
15. [Frontend State Management](#frontend-state-management)
16. [Drag-and-Drop Architecture](#drag-and-drop-architecture)
17. [Docker Infrastructure](#docker-infrastructure)
18. [Testing](#testing)
19. [Development Setup](#development-setup)
20. [Environment Variables](#environment-variables)
21. [Design Decisions Summary](#design-decisions-summary)

---

## Quick Start

```bash
docker compose up --build
```

| Service     | URL                          |
|-------------|------------------------------|
| Frontend    | http://localhost:5173         |
| Backend API | http://localhost:8000         |
| API Docs    | http://localhost:8000/docs    |
| Health      | http://localhost:8000/health  |

---

## System Architecture

```mermaid
graph TB
    subgraph "Client Browser"
        UI["React 18 + TypeScript"]
        DND["@dnd-kit Drag-and-Drop"]
        ZS["Zustand Store"]
        LR_C["Client LexoRank"]
        AX["Axios HTTP Client"]
    end

    subgraph "Vite Dev Server :5173"
        PROXY["/api Reverse Proxy"]
    end

    subgraph "FastAPI Backend :8000"
        CORS["CORS Middleware"]
        AUTH_R["Auth Router /api/v1/auth"]
        BOARD_R["Boards Router /api/v1/boards"]
        LIST_R["Lists Router /api/v1/lists"]
        CARD_R["Cards Router /api/v1/cards"]
        HEALTH["Health Check /health"]
        DEP["Dependency Injection Layer"]
        SEC["Security Module JWT + bcrypt"]
        SVC_B["Board Service"]
        SVC_L["List Service"]
        SVC_C["Card Service"]
        LR_S["Server LexoRank"]
        ORM["SQLAlchemy 2.0 Async ORM"]
    end

    subgraph "PostgreSQL 15"
        DB_U["users"]
        DB_B["boards"]
        DB_L["lists"]
        DB_C["cards"]
    end

    UI --> DND
    DND --> ZS
    ZS --> LR_C
    UI --> AX
    AX --> PROXY
    PROXY --> CORS
    CORS --> AUTH_R
    CORS --> BOARD_R
    CORS --> LIST_R
    CORS --> CARD_R
    CORS --> HEALTH
    AUTH_R --> SEC
    BOARD_R --> DEP
    LIST_R --> DEP
    CARD_R --> DEP
    DEP --> SEC
    DEP --> ORM
    BOARD_R --> SVC_B
    LIST_R --> SVC_L
    CARD_R --> SVC_C
    SVC_B --> LR_S
    SVC_L --> LR_S
    SVC_C --> LR_S
    SVC_B --> ORM
    SVC_L --> ORM
    SVC_C --> ORM
    ORM --> DB_U
    ORM --> DB_B
    ORM --> DB_L
    ORM --> DB_C
```

---

## Tech Stack

### Backend

| Technology             | Purpose                                              |
|------------------------|------------------------------------------------------|
| FastAPI 0.111          | Async Python web framework with auto OpenAPI docs    |
| SQLAlchemy 2.0         | Async ORM with `selectinload` for N+1 prevention    |
| PostgreSQL 15          | Primary database with UUID PKs and row-level locks   |
| Alembic 1.13           | Database schema migrations                           |
| python-jose            | JWT token creation and validation                    |
| bcrypt 5.0             | Password hashing (used directly, not via passlib)    |
| Pydantic V2            | Request/response validation with `from_attributes`   |
| asyncpg                | Async PostgreSQL driver                              |
| aiosqlite              | Async SQLite driver for local dev and tests          |

### Frontend

| Technology             | Purpose                                              |
|------------------------|------------------------------------------------------|
| React 18               | Component-based UI with TypeScript strict mode       |
| @dnd-kit               | Accessible drag-and-drop with SortableContext        |
| Zustand 4.5            | Lightweight global state with optimistic updates     |
| TanStack Query 5       | Server state management (QueryClientProvider)        |
| Axios 1.6              | HTTP client with request/response interceptors       |
| Tailwind CSS 3.4       | Utility-first styling with custom brand palette      |
| Lucide React           | SVG icon library                                     |
| Vite 5.2               | Build tool and dev server with HMR and API proxy     |

### Infrastructure

| Technology             | Purpose                                              |
|------------------------|------------------------------------------------------|
| Docker Compose         | 3-service orchestration (db, backend, frontend)      |
| PostgreSQL Alpine      | Lightweight database container with healthcheck      |
| Volume Mounts          | Hot reload for both backend and frontend in dev      |

---


## Database Schema

```mermaid
erDiagram
    users {
        uuid id PK
        varchar email UK
        varchar hashed_password
        varchar full_name
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    boards {
        uuid id PK
        varchar title
        text description
        uuid owner_id FK
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    lists {
        uuid id PK
        uuid board_id FK
        varchar title
        varchar rank
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    cards {
        uuid id PK
        uuid list_id FK
        uuid board_id FK
        varchar title
        text description
        varchar rank
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    users ||--o{ boards : "owns"
    boards ||--o{ lists : "contains"
    lists ||--o{ cards : "contains"
    boards ||--o{ cards : "belongs to"
```

Unique constraints: `(board_id, rank)` on `lists`, `(list_id, rank)` on `cards`. All tables include `deleted_at` for soft deletes. All primary keys are UUID v4.

---

## API Endpoints

| Method | Endpoint                    | Description                          | Auth Required |
|--------|-----------------------------|--------------------------------------|---------------|
| POST   | `/api/v1/auth/register`     | Register new user                    | No            |
| POST   | `/api/v1/auth/login`        | Login, returns JWT                   | No            |
| GET    | `/api/v1/boards`            | List current user's boards           | Yes           |
| POST   | `/api/v1/boards`            | Create board + default "To Do" list  | Yes           |
| GET    | `/api/v1/boards/{id}`       | Board detail with lists and cards    | Yes           |
| PATCH  | `/api/v1/boards/{id}`       | Update board title/description       | Yes           |
| DELETE | `/api/v1/boards/{id}`       | Soft delete cascade (board+lists+cards) | Yes        |
| POST   | `/api/v1/lists`             | Create list with LexoRank position   | Yes           |
| PATCH  | `/api/v1/lists/{id}`        | Update list title                    | Yes           |
| DELETE | `/api/v1/lists/{id}`        | Soft delete list and its cards       | Yes           |
| POST   | `/api/v1/cards`             | Create card at end of list           | Yes           |
| PATCH  | `/api/v1/cards/{id}`        | Update card title/description        | Yes           |
| POST   | `/api/v1/cards/{id}/move`   | Move card with FOR UPDATE lock       | Yes           |
| DELETE | `/api/v1/cards/{id}`        | Soft delete card                     | Yes           |

---

## Code Flow: Full Request Lifecycle

### Card Move -- End to End

```mermaid
sequenceDiagram
    participant U as User Browser
    participant DND as @dnd-kit DragEnd
    participant Store as Zustand Store
    participant LR as Client LexoRank
    participant API as Axios Client
    participant Proxy as Vite Proxy
    participant FW as FastAPI Router
    participant Dep as get_current_user
    participant Svc as card_service.move_card
    participant LRS as Server LexoRank
    participant DB as PostgreSQL

    U->>DND: Drop card onto new position
    DND->>DND: Identify source list, dest list, target index
    DND->>DND: Find before_rank and after_rank from neighbor cards
    DND->>LR: lexoRankBetween(before_rank, after_rank)
    LR-->>DND: optimistic_rank
    DND->>Store: Deep clone board as snapshot
    DND->>Store: optimisticMoveCard(cardId, src, dest, rank, index)
    Store-->>U: UI updates immediately (no spinner)
    DND->>API: POST /cards/{id}/move {list_id, before_rank, after_rank}
    API->>Proxy: Forward /api request
    Proxy->>FW: HTTP request to backend:8000
    FW->>Dep: Extract JWT, query user
    Dep-->>FW: CurrentUser
    FW->>Svc: move_card(db, card_id, data, owner_id)
    Svc->>DB: SELECT * FROM cards WHERE id=$1 FOR UPDATE
    Note over DB: Row-level lock acquired
    Svc->>DB: SELECT board WHERE owner_id matches
    Svc->>DB: SELECT list WHERE id = target_list_id
    Svc->>LRS: rank_between(before_rank, after_rank)
    LRS-->>Svc: new_rank
    Svc->>DB: Check rank collision in target list
    Svc->>DB: UPDATE card SET list_id, rank
    Svc->>DB: COMMIT
    Note over DB: Lock released
    DB-->>Svc: Updated card
    Svc-->>FW: Card response
    FW-->>Proxy: JSON response
    Proxy-->>API: Response
    API-->>DND: updated card data
    DND->>Store: syncCard(updated_card) -- apply server rank

    Note over DND: If API fails:
    DND->>Store: rollbackCard(snapshot)
    DND->>U: Toast error "Failed to move card. Changes reverted."
```

### Board Detail Fetch

```mermaid
sequenceDiagram
    participant C as Client
    participant F as FastAPI
    participant S as board_service
    participant DB as PostgreSQL

    C->>F: GET /api/v1/boards/{id}
    F->>F: Authenticate via JWT dependency
    F->>S: get_board_detail(db, board_id, owner_id)
    S->>DB: Query 1 -- SELECT * FROM boards WHERE id=$1 AND owner_id=$2
    S->>DB: Query 2 -- SELECT * FROM lists WHERE board_id IN ($1)
    S->>DB: Query 3 -- SELECT * FROM cards WHERE list_id IN ($1,$2,...)
    Note over S: Only 3 queries regardless of board size
    S->>S: Filter soft-deleted lists and cards in-memory
    S-->>F: Board with nested lists and cards
    F-->>C: JSON response (BoardDetailOut schema)
```

---

## Ordering Algorithm: LexoRank

### Why LexoRank Was Chosen Over Integer Indices

The fundamental problem with integer-based ordering is that repositioning a single item requires updating multiple rows. Consider a list of 100 cards ordered by an integer `position` column:

- Moving card from position 1 to position 50 requires: `UPDATE cards SET position = position - 1 WHERE position BETWEEN 2 AND 50`
- That is 49 rows touched for a single drag operation
- With concurrent users, this creates widespread lock contention

LexoRank solves this by using **base-36 string comparison** for ordering. Moving a card requires updating **exactly one row** -- the moved card itself. The new rank is computed as the lexicographic midpoint between its two neighbors.

### How LexoRank Works

```mermaid
graph LR
    subgraph "Rank Format"
        FMT["0|{rank_value}:"]
        BUCKET["0| = bucket prefix"]
        VALUE["{rank_value} = base-36 string"]
        SUFFIX[": = suffix delimiter"]
    end

    subgraph "Base-36 Charset"
        CS["0123456789abcdefghijklmnopqrstuvwxyz"]
    end

    subgraph "Example: Insert Between"
        A["Card A: 0|aaaaaa:"]
        B["Card B: 0|zzzzzz:"]
        MID["New Card: 0|hzzzzz:"]
        A -->|"midpoint"| MID
        MID -->|"midpoint"| B
    end
```

**Algorithm steps:**

1. **Parse**: Strip the `0|` prefix and `:` suffix to get the raw rank value
2. **Decode**: Convert the base-36 string to an integer
3. **Midpoint**: Compute `(before_int + after_int) / 2`
4. **Encode**: Convert the integer back to a base-36 string, zero-padded
5. **Format**: Wrap with `0|` prefix and `:` suffix

**Edge cases handled:**

- **Insert at start** (before = null): Halve the `after` rank's integer value
- **Insert at end** (after = null): Compute 3/4 of the way between `before` and the maximum possible value
- **Ranks too close**: When the midpoint equals either neighbor, extend the string by appending `"i"` (middle of alphabet)
- **Rank collision detection**: The server checks if the computed rank already exists in the target list and appends `"i"` if so
- **Database enforcement**: A unique constraint on `(list_id, rank)` prevents duplicate ranks at the database level

**Why the client also implements LexoRank:**

The frontend mirrors the backend algorithm in `src/utils/lexorank.ts` so that optimistic UI updates can compute a plausible rank immediately, before the server responds. The server's computed rank (which may differ due to concurrent activity) replaces the optimistic rank on API success via `syncCard`.

---

## Race Condition Handling

### The Problem

Two users (A and B) both drag Card X at the same time. Without protection:

1. Both read Card X's current state (list_id = L1, rank = "0|hzzzzz:")
2. Both compute new ranks based on the same stale neighbor information
3. Both write their updates -- one overwrites the other
4. The card ends up in the wrong position, or two cards share the same rank

### The Solution: SELECT FOR UPDATE

The `move_card` function in `card_service.py` uses PostgreSQL's row-level locking:

```sql
SELECT * FROM cards WHERE id = $1 FOR UPDATE
```

```mermaid
sequenceDiagram
    participant A as User A Transaction
    participant DB as PostgreSQL
    participant B as User B Transaction

    A->>DB: BEGIN
    A->>DB: SELECT * FROM cards WHERE id='card-x' FOR UPDATE
    Note over DB: Row lock acquired by A
    B->>DB: BEGIN
    B->>DB: SELECT * FROM cards WHERE id='card-x' FOR UPDATE
    Note over B,DB: B BLOCKS here -- waiting for A's lock

    A->>DB: UPDATE cards SET list_id='L2', rank='0|dzzzzz:'
    A->>DB: COMMIT
    Note over DB: Lock released

    Note over B: B unblocks, reads UPDATED card state
    B->>DB: Card now shows list_id='L2', rank='0|dzzzzz:'
    B->>DB: Computes new rank relative to CURRENT state
    B->>DB: UPDATE cards SET list_id='L3', rank='0|hzzzzz:'
    B->>DB: COMMIT
```

**Why SELECT FOR UPDATE over optimistic locking (version counters):**

- Card moves are infrequent relative to reads
- Lock hold time is minimal (under 5ms for typical moves)
- No retry logic needed on the client -- the second transaction simply waits
- Version counter approaches would require the client to detect conflicts and retry, adding complexity
- `FOR UPDATE` guarantees serialized execution for the same card without affecting other cards

**SQLite compatibility:**

SQLite does not support `FOR UPDATE`. The code detects the database dialect at runtime and skips the locking clause when running on SQLite (used in tests and local development). This is acceptable because SQLite serializes all writes at the database level anyway.

---

## Optimistic UI and Rollback

```mermaid
stateDiagram-v2
    [*] --> UserDropsCard
    UserDropsCard --> ComputeOptimisticRank: lexoRankBetween()
    ComputeOptimisticRank --> SaveSnapshot: JSON deep clone
    SaveSnapshot --> ApplyOptimistic: Store.optimisticMoveCard()
    ApplyOptimistic --> UIUpdated: User sees card in new position
    UIUpdated --> FireAPICall: async POST /cards/{id}/move
    FireAPICall --> APISuccess: 200 OK
    FireAPICall --> APIFailure: Network or server error
    APISuccess --> SyncServerRank: Store.syncCard(response)
    APIFailure --> Rollback: Store.rollbackCard(snapshot)
    Rollback --> ShowToast: "Failed to move card. Changes reverted."
    SyncServerRank --> [*]
    ShowToast --> [*]
```

The optimistic update strategy ensures the UI feels instant. The board state is deep-cloned before mutation so that any failure can restore the exact previous state. The server-computed rank replaces the client-computed rank on success to account for any differences (such as collision resolution or concurrent modifications).

---

## N+1 Query Prevention

The `get_board_detail` function uses SQLAlchemy's `selectinload` strategy:

```python
select(Board)
    .options(selectinload(Board.lists).selectinload(List.cards))
```

This generates exactly **3 SQL queries** regardless of how many lists or cards exist:

| Query | SQL | Result |
|-------|-----|--------|
| 1 | `SELECT * FROM boards WHERE id = $1 AND owner_id = $2` | 1 board |
| 2 | `SELECT * FROM lists WHERE board_id IN ($1)` | N lists |
| 3 | `SELECT * FROM cards WHERE list_id IN ($1, $2, ...)` | All cards |

Without `selectinload`, accessing `board.lists[0].cards` would trigger a lazy load query per list, resulting in 1 + N + (N * M) queries for a board with N lists and M cards per list.

---

## Soft Delete Cascade

All entities use `deleted_at` timestamps instead of `DELETE FROM`. The cascade flow:

```mermaid
graph TD
    A["DELETE /boards/{id}"] --> B["Set board.deleted_at = now()"]
    B --> C["Query all lists WHERE board_id = X"]
    C --> D["Set list.deleted_at = now() for each"]
    D --> E["Query all cards WHERE board_id = X"]
    E --> F["Set card.deleted_at = now() for each"]
    F --> G["Single COMMIT"]

    H["DELETE /lists/{id}"] --> I["Set list.deleted_at = now()"]
    I --> J["Query all cards WHERE list_id = X"]
    J --> K["Set card.deleted_at = now() for each"]
    K --> L["Single COMMIT"]

    M["DELETE /cards/{id}"] --> N["Set card.deleted_at = now()"]
    N --> O["Single COMMIT"]
```

All read queries include `WHERE deleted_at IS NULL` to exclude soft-deleted records. Data remains in the database for auditing and potential recovery.

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React App
    participant AX as Axios Client
    participant BE as FastAPI
    participant DB as PostgreSQL

    Note over U,DB: Registration
    U->>FE: Fill email, password, name
    FE->>AX: POST /auth/register {email, password, full_name}
    AX->>BE: Forward request
    BE->>DB: Check email uniqueness
    BE->>BE: bcrypt.hashpw(password)
    BE->>DB: INSERT INTO users
    BE-->>AX: UserOut {id, email, full_name}

    Note over U,DB: Login
    FE->>AX: POST /auth/login (form-urlencoded)
    AX->>BE: username=email, password=password
    BE->>DB: SELECT user WHERE email
    BE->>BE: bcrypt.checkpw(password, hash)
    BE->>BE: jwt.encode({sub: email, exp: now+60min})
    BE-->>AX: Token {access_token, token_type: "bearer"}
    AX-->>FE: Store token in localStorage

    Note over U,DB: Authenticated Request
    FE->>AX: GET /boards (auto-injected Authorization header)
    AX->>BE: Authorization: Bearer <token>
    BE->>BE: jwt.decode(token) -> {sub: email}
    BE->>DB: SELECT user WHERE email AND deleted_at IS NULL
    BE-->>AX: Board data

    Note over U,DB: Token Expiry
    AX->>BE: Request with expired token
    BE-->>AX: 401 Unauthorized
    AX->>AX: Remove token from localStorage
    AX->>FE: Dispatch 'auth:logout' event
    FE->>U: Show login modal
```

---

## Frontend State Management

```mermaid
graph TD
    subgraph "Zustand Board Store"
        STATE["board: BoardDetail | null<br/>isLoading: boolean<br/>error: string | null"]
    end

    subgraph "Actions"
        SB["setBoard()"]
        OMC["optimisticMoveCard()"]
        RB["rollbackCard()"]
        SC["syncCard()"]
        AC["addCard()"]
        RC["removeCard()"]
        AL["addList()"]
    end

    subgraph "Consumers"
        BV["BoardView.tsx"]
        LC["ListColumn.tsx"]
    end

    BV -->|"reads"| STATE
    LC -->|"reads"| STATE
    BV -->|"calls"| SB
    BV -->|"calls"| OMC
    BV -->|"calls"| RB
    BV -->|"calls"| SC
    BV -->|"calls"| AL
    LC -->|"calls"| AC
    LC -->|"calls"| RC
    SB --> STATE
    OMC --> STATE
    RB --> STATE
    SC --> STATE
    AC --> STATE
    RC --> STATE
    AL --> STATE
```

All store mutations create deep clones via `JSON.parse(JSON.stringify(...))` to ensure immutability. Lists and cards are re-sorted by rank after every mutation.

---

## Drag-and-Drop Architecture

```mermaid
graph TD
    subgraph "DndContext (BoardView)"
        PS["PointerSensor<br/>distance: 5px"]
        CC["closestCorners<br/>collision detection"]
        DS["DragStartEvent"]
        DO["DragOverEvent"]
        DE["DragEndEvent"]
        DOV["DragOverlay"]
    end

    subgraph "SortableContext - Horizontal"
        L1["ListColumn 1"]
        L2["ListColumn 2"]
        L3["ListColumn 3"]
    end

    subgraph "SortableContext - Vertical (per list)"
        C1["CardItem (useSortable)"]
        C2["CardItem (useSortable)"]
        C3["CardItem (useSortable)"]
    end

    subgraph "Droppable Targets"
        D1["useDroppable: list.id"]
    end

    PS --> DS
    DS --> DO
    DO --> DE
    DE -->|"same list"| REORDER["Filter active card,<br/>get neighbor ranks"]
    DE -->|"cross list"| CROSS["Get dest list<br/>neighbor ranks"]
    REORDER --> COMPUTE["lexoRankBetween()"]
    CROSS --> COMPUTE
    COMPUTE --> OPTIMISTIC["optimisticMoveCard()"]
    OPTIMISTIC --> APICALL["cardsApi.move()"]
    DOV -->|"renders"| GHOST["Rotated card ghost"]
```

---

## Docker Infrastructure

```mermaid
graph LR
    subgraph "docker-compose.yml"
        DB["db<br/>postgres:15-alpine<br/>:5432"]
        BE["backend<br/>python:3.11-slim<br/>:8000"]
        FE["frontend<br/>node:20-alpine<br/>:5173"]
    end

    DB -->|"healthcheck:<br/>pg_isready"| BE
    BE -->|"depends_on:<br/>service_healthy"| DB
    FE -->|"depends_on"| BE

    subgraph "Volumes"
        PG["pgdata:<br/>persistent DB"]
        BESRC["./backend:/app<br/>hot reload"]
        FESRC["./frontend/src:/app/src<br/>hot reload"]
    end

    DB --> PG
    BE --> BESRC
    FE --> FESRC
```

The backend container runs `alembic upgrade head` before starting uvicorn. The frontend Vite dev server proxies `/api` requests to the backend container using `VITE_PROXY_TARGET`.

---

## Testing

```bash
cd backend
pip install -r requirements.txt
pytest app/tests/ -v --tb=short

# With coverage
pytest app/tests/ --cov=app --cov-report=term-missing
```

| Test File | Tests | Coverage Area |
|-----------|-------|---------------|
| `test_auth.py` | 5 | Registration, login, validation, auth guards |
| `test_boards.py` | 5 | CRUD, soft delete, cross-user isolation |
| `test_cards.py` | 5 | CRUD, cross-list move, LexoRank format, soft delete |
| `test_lexorank.py` | 6 | Algorithm correctness, ordering, collision resistance |

Tests use SQLite via `aiosqlite` with per-test table creation/teardown for full isolation. The `conftest.py` overrides FastAPI's `get_db` dependency to use the test database.

---

## Development Setup

### Local Development (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:8000` by default. No `VITE_API_URL` configuration is needed for local development.

### With Docker

```bash
docker compose up --build
```

All services start with hot reload enabled via volume mounts.

---

## Environment Variables

| Variable                      | Default                                  | Required | Description                    |
|-------------------------------|------------------------------------------|----------|--------------------------------|
| `DATABASE_URL`                | `sqlite+aiosqlite:///./taskflow.db`      | No       | Database connection string     |
| `SECRET_KEY`                  | `supersecretkey123changeinprod`           | Yes (prod) | JWT signing secret           |
| `ALGORITHM`                   | `HS256`                                  | No       | JWT algorithm                  |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60`                                     | No       | Token time-to-live in minutes  |
| `VITE_API_URL`                | `/api/v1`                                | No       | Frontend API base URL          |
| `VITE_PROXY_TARGET`           | `http://localhost:8000`                  | No       | Vite proxy target (Docker)     |
| `TEST_DATABASE_URL`           | Not set                                  | No       | Override DB URL for tests      |

---

## Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Ordering algorithm | LexoRank (base-36 strings) | Single-row updates on move; O(1) instead of O(n) |
| Concurrency control | `SELECT ... FOR UPDATE` | Serializes concurrent moves on the same card with minimal lock time |
| Query optimization | `selectinload` chain | Exactly 3 queries for any board size; prevents N+1 |
| Deletion strategy | Soft delete with `deleted_at` | Data recovery, audit trail, single-transaction cascades |
| UI responsiveness | Optimistic updates + rollback | Instant drag-and-drop feel; snapshot-based rollback on failure |
| Client LexoRank | Mirrored implementation | Enables optimistic rank computation without server round-trip |
| Authentication | Stateless JWT + bcrypt | No server-side session storage; secure password hashing |
| State management | Zustand | Minimal boilerplate; immutable deep clones for safety |
| Drag-and-drop | @dnd-kit | Accessible, composable, supports nested sortable contexts |
| TypeScript | Strict mode, zero `any` | Catches errors at compile time; self-documenting interfaces |
| Database | PostgreSQL + UUID PKs | Native UUID support, `FOR UPDATE` locking, robust indexing |
| Dev/test DB | SQLite via aiosqlite | Zero-config local development; per-test isolation |
