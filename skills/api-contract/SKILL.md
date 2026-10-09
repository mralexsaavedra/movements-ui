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
| HTTP repository           | `infrastructure/repositories/createHttpMovementRepository.ts`                     |
| Mock transport            | `infrastructure/mock/` (generator, cursor, PRNG, `createMockMovementsHttpClient`) |
| Transport port + fetch    | `src/shared/http/` (`HttpClient`, `HttpError`, `createFetchHttpClient`)           |
| Composition root          | `src/app/dependencies.ts`                                                         |

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

`createHttpMovementRepository({ httpClient, reporter })`: `httpClient.get("/items", { query:
{ cursor, limit }, signal })` → `parseMovementsPage(raw, reporter)`. Transport errors
(`HttpError`, status `0` = no response) and aborts propagate untouched.

## 5. Mock Transport (deterministic)

The mock is an `HttpClient`, not a repository: it returns raw JSON so the real repository,
Zod validation and mapper always run. Never return domain objects from a mock.

```ts
const httpClient = createMockMovementsHttpClient({
  seed: 42, // same seed => same dataset and failures
  total: 5000, // 0 => empty list
  latencyMs: 0, // 400 by default; 0 in tests; honours AbortSignal
  failOnPage: 3, // always 503 on that page; or failureRate: 0..1 (seeded)
  invalidItemRate: 0.1, // contract-violating items => dropped + counted
});
const repository = createHttpMovementRepository({ httpClient, reporter });
```

- Generator (`generateItemDtos`) uses mulberry32 and a fixed `anchorDate`: no `Math.random`,
  no `Date.now`. Covers every state: long names, `imageUrl: null`, flagged, pending,
  several currencies (mostly EUR). Fictional merchants/people only.
- Cursor is opaque to clients (base64 offset inside the mock); invalid/out-of-range → 400.
  `limit` default 20, clamped to 100.
- MSW intercepting `fetch` is the documented next step once a real backend exists
  (`contract/README.md`).
