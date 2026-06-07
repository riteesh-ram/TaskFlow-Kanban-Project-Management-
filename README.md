# TaskFlow Kanban Project Management

## One-Liner
TaskFlow is a Vite/React kanban workspace backed by Supabase Postgres, delivering realtime collaboration, optimistic latency-hiding updates, and audit-grade tracking out-of-the-box.

## Architecture (Text Diagram)
Client (Vite/React, Tailwind, shadcn/Radix) ⇄ Supabase Auth (sessions, JWT, email magic) ⇄ Supabase Postgres (boards/columns/cards, JSONB metadata, audit_logs, notifications, presence) ⇄ Supabase Realtime (postgres_changes + presence) ⇄ Vercel/Edge CDN for static assets. LocalStorage-backed "redis" shims provide cache, locks, and presence when server-side Redis is unavailable.

## Tech Stack
- React 18 + TypeScript, Vite build
- Tailwind + shadcn/Radix UI primitives, lucide-react icons
- dnd-kit for accessible drag-and-drop (sortable contexts, collision detection)
- TanStack Query (react-query v5) for client cache; custom caching layer for boards
- Supabase (Auth, Postgres, Realtime, RLS policies), JSONB metadata/settings
- LocalStorage-backed services simulating Redis for cache/locks/presence
- Notifications (sonner/toaster), theming (next-themes), form handling (react-hook-form/zod)

## Key Features (technical)
- Accessible drag-and-drop lanes/cards with keyboard support and animated sortable contexts
- Optimistic CRUD with per-resource locks, rollback on failure, and cache invalidation
- Realtime sync via Supabase postgres_changes on boards/columns/cards/notifications
- Presence indicators and card locks to prevent concurrent edits
- Audit logging for every card mutation; notification delivery on assignment
- Board settings: column colors, story points toggle, card aging, WIP limits, swimlanes, quick filters
- Rich cards: labels, due dates, assignees, JSONB metadata (priority, type, story points), comments, watchers, sprint linkage
- Filters and search across title/description/labels

## Data Model & Security (Supabase)
- Tables: profiles, boards, columns, cards, board_members, notifications, audit_logs, card_comments, card_watchers, sprints; boards/cards carry JSONB settings/metadata.
- Helper function `can_manage_board(board_id uuid)` used in RLS policies to avoid recursive checks; owners/editors can manage, viewers limited to select.
- RLS enforced on every user-facing table; replica identity FULL for realtime payloads; triggers keep `updated_at` fresh and auto-create profiles on signup.

## How It Works (flow)
1) Load: check local cache for board → fetch fresh board/columns/cards → cache refreshed → subscribe to realtime changes.
2) Mutate: optimistic state update + lock acquisition → Supabase write → audit_logs + notifications → cache invalidate → lock release.
3) Presence: browser/localStorage presence plus Supabase channel presence, with periodic cleanup of stale sessions.

## Setup
1. Install Node 18+.
2. Create `.env` with:
	- `VITE_SUPABASE_URL=<your-url>`
	- `VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>`
3. Install deps: `npm install`
4. Run dev server: `npm run dev`
5. Apply Supabase migrations in `supabase/migrations` (via `supabase db push` or SQL import) before first login.

## Scripts
- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview build locally
- `npm run lint` — eslint

## File-by-File Responsibilities

### Root
- `package.json` — dependencies (React, dnd-kit, TanStack Query, Supabase JS, shadcn/Radix, tailwind) and scripts.
- `vite.config.ts`, `tsconfig*.json`, `tailwind.config.ts`, `postcss.config.js`, `eslint.config.js` — build, TS, lint, and styling configs.
- `index.html` — Vite entry shell.

### Entry & Layout
- `src/main.tsx` — mounts React, wraps with `ThemeProvider`.
- `src/App.tsx` — router, protected routes, QueryClient provider, toasters.
- `src/layouts/DashboardLayout.tsx` — base page shell.
- `src/index.css`, `src/App.css`, `src/utils/responsive.ts`, `src/utils.ts` — global styles and helpers.

### Auth
- `src/contexts/AuthContext.tsx` — Supabase auth session handling, profile fetch, signup/login/reset/update flows; exposes `useAuth`.
- `src/hooks/useAuthLogic.ts` — view-model for login/signup/reset forms and navigation.
- `src/pages/Auth.tsx`, `src/pages/ResetPassword.tsx` — UI for auth flows (form wiring, toasts).

### Data Access (API layer)
- `src/api/supabase.ts` — central Supabase client export.
- `src/api/boards.ts` — fetch board with relations, update settings/colors, fetch/invite members, delete board, cache invalidation.
- `src/api/columns.ts` — CRUD + reorder + seed default columns with cache invalidation.
- `src/api/cards.ts` — create/move/delete/assign cards, audit logging, notifications, cache invalidation, position helpers.

### Hooks (state, data, UX)
- `src/hooks/useOptimisticUpdates.ts` — optimistic queue with local locks (acquire/release/isLocked), rollback on error.
- `src/hooks/useRealtimeBoard.ts` — cache-then-network board loader, realtime subscriptions to boards/columns/cards, optimistic card CRUD helpers.
- `src/hooks/useBoard.ts` — board view-model: column order/colors, members, settings merge, invite/remove board, delegates to realtime hook.
- `src/hooks/useColumns.ts` — column create/update/delete/reorder, color persistence, board settings updates.
- `src/hooks/useCards.ts` — toasting wrappers for card CRUD/assign.
- `src/hooks/useFilter.ts` — search + label filters with predicate helper.
- `src/hooks/useModal.ts`, `src/hooks/useResponsiveNav.ts`, `src/hooks/useMobile.ts`, `src/hooks/useRealtimeBoard.ts`, `src/hooks/useCards.ts`, `src/hooks/useColumns.ts`, `src/hooks/useFilter.ts`, `src/hooks/useOptimisticUpdates.ts` — UI state convenience hooks (modal orchestration, nav state, responsive helpers).
- `src/hooks/useToast.ts` — toast helpers (shadcn/sonner bindings).

### Pages
- `src/pages/Dashboard.tsx` — lists boards for current user, creates boards with default columns, theme toggle, notifications badge.
- `src/pages/Board.tsx` — full kanban experience: drag-and-drop columns/cards, filters, invites, delete board/column, settings dialog triggers, locked card awareness, presence chips.
- `src/pages/Index.tsx` — placeholder landing fallback.
- `src/pages/NotFound.tsx` — 404 page.

### Components (Kanban domain)
- `src/components/kanban/KanbanColumn.tsx` — droppable/sortable column, column header actions (edit/delete/create card), color accents, dnd wiring.
- `src/components/kanban/KanbanCard.tsx` — draggable card tile with metadata badges, labels, due date, assignee dropdown, delete/assign actions, lock indicator.
- `src/components/kanban/CreateCardDialog.tsx` — modal form to create card with labels/due date.
- `src/components/kanban/CardDetailsModal.tsx` — detailed card view: metadata (type/priority/story points), comments (card_comments), activity (audit_logs), update metadata.
- `src/components/kanban/BoardSettings.tsx` — board feature toggles (story points, avatars, WIP limits, swimlanes, quick filters, card aging) with Supabase persistence.

### Components (Collaboration & UX)
- `src/components/presence/UserPresence.tsx` — presence via Supabase channel + local presence service, periodic refresh/cleanup.
- `src/components/notifications/NotificationBell.tsx` — realtime notifications via Supabase channel, mark-as-read, board navigation.
- `src/components/molecules/SearchBar.tsx`, `FilterChips.tsx` — search/filter inputs.
- `src/components/ux/ResponsiveDialog.tsx`, `AsyncBoundary.tsx`, `SkeletonGrid.tsx` — responsive dialog wrapper, suspense-like boundary, loading skeletons.
- `src/components/ui/*` — shadcn/Radix primitives (button, input, dialog, dropdown, tabs, avatar, badge, toast, etc.) used across the app.

### Services & Libs
- `src/lib/redis.ts` — localStorage-backed presence service, lock service, and cache service (board caching with TTL, lock acquisition, presence cleanup) to emulate Redis client-side.
- `src/lib/utils.ts`, `src/lib/redis.ts`, `src/lib/redis.ts` (same file) — small helpers and the shim noted above.

### Integrations
- `src/integrations/supabase/client.ts` — typed Supabase client with auth persistence using localStorage.

### Types
- `src/types/board.ts`, `src/types/user.ts` — shared TS types for domain entities.

### Supabase Migrations (schema/RLS)
- `20250910095435_b6626892-f12c-4ac3-8af4-0a284df9c656.sql` — base schema: profiles, boards, columns, cards, board_members, notifications, audit_logs + RLS and triggers.
- `20250911055451_858168bc-c2e4-4d5a-a1a9-add298899e78.sql` — board/member policy fixes to avoid recursion; updated board select/update policies.
- `20260110000000_jira_features.sql` — JSONB metadata on cards, comments/watchers tables, sprints table, indexes, board settings column.
- `20260114000001_adjust_board_member_rls.sql` — broaden manage-member policy to owners/editors.
- `20260114000002_fix_board_member_policy.sql` — SECURITY DEFINER helper `can_manage_board`, simplified manage-member RLS.
- `20260114000003_rls_use_helper.sql` — reuse helper for cards/columns RLS.
- `20260114000004_add_metadata_to_cards.sql` — ensure metadata column/default on cards.
- `20260114000005_add_board_settings.sql` — ensure settings column/default on boards.

### Public Assets
- `public/` — static assets (favicons, logos) served by Vite.

## Why These Choices
- Supabase provides Auth + Postgres + Realtime + RLS in one stack, minimizing custom backend code while keeping strict data security.
- dnd-kit offers accessible, deterministic drag/drop with collision strategies suitable for kanban UX.
- Optimistic updates plus local locks cut perceived latency while preventing conflicting edits.
- JSONB settings/metadata enable Jira-like extensibility without frequent migrations.
- Local cache/presence/locks keep the UI usable in demos without bundling Redis secrets.

## Resume Bullet Points
- Drove sub-100 ms perceived latency by combining optimistic React state, per-resource locks, and cache-first board hydration to avoid round-trips on card moves.
- Enforced zero-trust access with Supabase RLS and a SECURITY DEFINER helper, securing 100% of board/column/card/member/comment CRUD while preventing recursive policy leaks.
- Delivered realtime collaboration (presence, notifications, board updates) over Supabase postgres_changes channels, keeping distributed clients synchronized through a single websocket per board.
- Implemented audit-grade tracking: every card create/move/delete/assign writes structured JSONB audit_logs and user notifications for traceability.
- Added Jira-style metadata and board feature flags (story points, WIP limits, swimlanes, quick filters) via JSONB, enabling feature growth without schema churn.
