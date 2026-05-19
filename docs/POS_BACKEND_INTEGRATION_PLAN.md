# POS Backend Integration Plan

## Current State

The ClubX POS frontend is still a localStorage/mock MVP. Dashboard, POS workspace, table canvas, table merge/split, menu settings, orders, payments, reservations, waiting, Handy orders, QR fallback, local sync, and localStorage schema reset continue to run in local mode.

The ClubX backend now has a POS foundation under:

```txt
/api/v1/pos
```

Phase 13B adds frontend API and repository boundaries only. It does not migrate Zustand stores to server persistence yet.

## Added In Phase 13B

- `lib/api/posClient.ts`: typed POS REST client for `/pos`.
- `types/posApi.ts`: backend DTO types kept separate from frontend domain types in `types/index.ts`.
- `lib/pos/repositories/types.ts`: repository interfaces for POS data domains.
- `lib/pos/repositories/local`: localStorage-backed repository implementation using current keys.
- `lib/pos/repositories/server`: backend-backed repository implementation using the POS client.
- `lib/pos/repositories/index.ts`: mode selector.
- `lib/pos/mappers.ts`: frontend domain type ↔ backend DTO mapper functions.

## Data Modes

Mode is selected by:

```txt
NEXT_PUBLIC_POS_DATA_MODE=local | server
```

Default is `local`.

Invalid or missing values fall back to `local`.

Local mode remains the production-safe fallback until each store is migrated and QA-tested. It also remains useful for network-failure rehearsals and emergency operation.

## Local Mode

Local repositories preserve current localStorage keys and data shapes:

- `clubx-pos:tables:{sessionId}`
- `clubx-pos:table-merge-groups:{sessionId}`
- `clubx-pos:menu-categories:{sessionId}`
- `clubx-pos:menu-items:{sessionId}`
- `clubx-pos:menu-locked:{sessionId}`
- `clubx-pos:party-cards:{sessionId}`
- `clubx-pos:visits:{sessionId}`
- `clubx-pos:orders:{sessionId}`
- `clubx-pos:payments:{sessionId}`
- `clubx-pos:handy-devices`
- `clubx-pos:qr-orders:{sessionId}`
- `clubx-pos:time-logs:{sessionId}`

BroadcastChannel/localStorage sync is intentionally kept. Server realtime comes later.

## Server Mode

Server repositories call `lib/api/posClient.ts`, which uses the existing API client/proxy pattern. The base backend path is `/pos`, resolved under the current API base.

Several endpoints, especially menu and time-log list helpers, are intentionally marked with TODOs where backend route details still need to be finalized or wired into Phase 13C.

## Migration Order

1. Sessions
2. Tables / merge groups
3. Menu
4. Party cards / visits
5. Orders
6. Payments
7. Handy devices
8. QR fallback
9. Waiting/reservation operational sync

Each step should keep:

```txt
NEXT_PUBLIC_POS_DATA_MODE=local
```

fully compatible with the current app before enabling:

```txt
NEXT_PUBLIC_POS_DATA_MODE=server
```

for that domain.

## Semantics To Preserve

- Join is a state: one table can have multiple Party Cards.
- `1+3+4` labels only come from Table Merge.
- `OrderItem.menuName` and `OrderItem.unitPrice` are order-time snapshots.
- QR fallback must preserve `idempotencyKey` to prevent duplicate registration.
- Payment cancel is `status=cancelled`, not deletion.
- Restore payment changes the existing record back to `status=paid`.
- Realtime should be added only after server persistence is stable.

## Phase 13C

Phase 13C should migrate stores gradually:

1. Sessions store server mode
2. Tables / merge groups server mode
3. Menu settings server mode
4. Party cards / visits server mode
5. Orders server mode
6. Payments server mode
7. Handy devices server mode
8. QR fallback server mode

Do not migrate all stores in one change. Each store should have local mode QA and server mode QA before the next store moves.
