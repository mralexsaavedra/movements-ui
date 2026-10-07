---
name: api-contract
description: "Trigger: OpenAPI contract, DTO, API types, Zod schema, payload validation, mapper, mock adapter, fake repository, repository port, GET /items. Contract-to-domain integration rules."
license: MIT
metadata:
  author: alexander-saavedra
  version: "1.0"
---

## Activation Contract

Load before touching `features/*/infrastructure/` or the domain repository port.

## Contract (source of truth)

`GET /items?cursor=<string, optional>&limit=<int, default 20>` → 200:

```
{ items: Item[], nextCursor: string | null }
Item = { id, type: "inbound"|"outbound", status: "pending"|"confirmed",
         amount: { value: number, currency: string },
         label: { name: string, imageUrl: string | null },
         category: string, date: string (ISO 8601), flagged: boolean }
```

## Files

| Piece                     | Location (`src/features/movements/`)                                              |
| ------------------------- | --------------------------------------------------------------------------------- |
| Spec (source of truth)    | `contract/openapi.yaml` (repo root)                                               |
| DTO types                 | `infrastructure/dto/ItemDto.ts`                                                   |
| Zod schemas + drift guard | `infrastructure/schemas/itemSchema.ts`                                            |
| DTO → domain mapper       | `infrastructure/mappers/toMovement.ts`                                            |
| Invalid-data policy       | `infrastructure/parseMovementsPage.ts`                                            |
| Reusable fixtures         | `infrastructure/__fixtures__/itemDtos.ts`                                         |
| Entity, port, errors      | `domain/{Movement,MovementRepository,ContractError,ContractViolationReporter}.ts` |

## 1. DTO Types (manual, readonly)

`ItemDto` / `ItemsPageDto` mirror `Item` / `ItemsPage` 1:1 (names follow the contract, not the
domain). Everything `readonly`.

**Why manual, not codegen (`openapi-typescript`, `orval`):** one endpoint, ~10 fields, no
backend-published spec to generate from; codegen adds a build step for little gain, and runtime
validation is needed anyway. When the backend publishes and versions the spec, switch to
codegen (ideally generating Zod too) and keep the mapper layer unchanged.

## 2. Zod Schema at the Boundary (Zod 4)

- `itemSchema` validates one item; `itemsPageEnvelopeSchema` validates the envelope with
  `items: z.array(z.unknown())` so items are validated one by one.
- Stricter than the spec, each rule justified in a comment: `amount.value` `nonnegative()`
  (Zod 4 `z.number()` already rejects `Infinity`/`NaN`), `currency` `/^[A-Z]{3}$/`,
  `date` `z.iso.datetime({ offset: true })`, `id`/`label.name` `min(1)`,
  `imageUrl` `z.httpUrl().nullable()`.
- Drift guard: `ItemSchemaMatchesDto` asserts `z.infer<typeof itemSchema>` and `ItemDto` are
  mutually assignable. Changing either side without the other fails `pnpm typecheck`.

## 3. Invalid-Data Policy (`parseMovementsPage(raw, reporter)`)

| Case             | Behaviour                                                                         |
| ---------------- | --------------------------------------------------------------------------------- |
| Envelope invalid | throw `ContractError` (domain) with `{ path, code }` issues → UI error + retry    |
| Item invalid     | drop it, `invalidCount += 1`, `reporter.reportInvalidItem({ index, id, issues })` |
| Item valid       | `toMovement(dto)`                                                                 |

Reports and errors carry paths and Zod issue codes only — never raw values or Zod messages
(payloads contain money data). The reporter is a domain port; no `console` in domain code.

## 4. Mapper DTO → Domain

`toMovement`: `type` → `direction`, `label` → `counterparty`, ISO string → `Date`; everything
else 1:1. Domain never sees DTOs; UI never sees DTOs. The sign is applied at formatting time
(`domain/formatting/formatAmount.ts`).

## Repository Port

```ts
// domain/MovementRepository.ts
export interface MovementRepository {
  readonly getMovements: (params: GetMovementsParams) => Promise<MovementsPage>;
}
```

HTTP adapter: `fetch` → `json()` → `parseMovementsPage(raw, reporter)`.

## 5. Mock Adapter (deterministic)

```ts
// infrastructure/repositories/createMockMovementRepository.ts
interface MockOptions {
  readonly seed?: number; // same seed => same dataset
  readonly total?: number; // e.g. 5000 rows
  readonly latencyMs?: number; // simulate network
  readonly failRate?: number; // 0..1 error injection
  readonly reporter?: ContractViolationReporter; // where dropped items are reported
}

export const createMockMovementRepository = (opts: MockOptions = {}): MovementRepository => {
  const { seed = 42, total = 5000, latencyMs = 400, failRate = 0 } = opts;
  const rng = mulberry32(seed);
  const dataset = Array.from({ length: total }, (_, i) => generateMovementDto(rng, i));

  return {
    getMovements: async ({ cursor, limit }) => {
      await delay(latencyMs);
      if (rng() < failRate) throw new NetworkError("Injected failure");
      const start = cursor ? Number(decodeCursor(cursor)) : 0;
      const items = dataset.slice(start, start + limit);
      const next = start + limit < total ? encodeCursor(String(start + limit)) : null;
      // Pass through the SAME parser as HTTP to exercise the boundary.
      return parseMovementsPage({ items, nextCursor: next }, reporter);
    },
  };
};
```

- Cursor is opaque (base64 offset), never a page number exposed to UI.
- Generator covers every state: long names, `imageUrl: null`, flagged, pending, multiple currencies.
- Alternative is MSW intercepting `fetch`; record the choice and rationale in the ODD doc/README.
