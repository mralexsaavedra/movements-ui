# Contract

`openapi.yaml` is the documented source of truth for `GET /items` (OpenAPI 3.1).

## How the app consumes it

| Piece      | Location                                                      | Role                                          |
| ---------- | ------------------------------------------------------------- | --------------------------------------------- |
| DTO types  | `src/features/movements/infrastructure/dto/`                  | Hand-written, `readonly`, mirror the spec 1:1 |
| Zod schema | `src/features/movements/infrastructure/schemas/`              | Runtime validation at the boundary            |
| Mapper     | `src/features/movements/infrastructure/mappers/`              | DTO → domain `Movement`                       |
| Parser     | `src/features/movements/infrastructure/parseMovementsPage.ts` | Applies the invalid-data policy               |

A compile-time assertion checks that `z.infer<typeof itemSchema>` and the DTO type are
identical in both directions, so the schema and the types cannot drift silently.

## Why hand-written types instead of codegen

The contract is one endpoint with about ten fields and there is no backend-published spec to
generate from. Codegen (`openapi-typescript`, `orval`) would add a build step for little gain,
and runtime validation is needed anyway because types alone do not protect against a bad
payload. Once a backend publishes and versions the spec, generating types (and ideally Zod
schemas) from it becomes the better call; the mapper layer stays unchanged.

## Stricter than the spec

The schema intentionally rejects values the spec allows but the UI cannot render correctly
(negative or non-finite amounts, non-ISO-4217 currency codes, dates without a timezone,
empty ids/names, non-http(s) image URLs). Each rule is justified next to it in the schema.

## Invalid data policy

- Invalid envelope (not an object, `items` not an array, bad `nextCursor`): the page fails
  with a `ContractError`; the UI shows an error with retry.
- Invalid item: dropped, counted in `invalidCount`, and reported (id, index, issue paths —
  never raw values) through an injected reporter. Valid items on the same page still render.

## Transport and mock backend

```
UI → MovementRepository (domain port)
       └─ createHttpMovementRepository  (GET /items → parseMovementsPage)
            └─ HttpClient (port, src/shared/http)
                 ├─ createFetchHttpClient          real backend over fetch
                 └─ createMockMovementsHttpClient  seeded in-process backend (default)
```

The mock replaces the **transport**, not the repository: it answers `GET /items` with raw JSON,
so the real repository, Zod validation, invalid-data policy and mapper run exactly as they would
against a server. An in-memory fake repository would skip that whole boundary and could hide
contract bugs.

### Behaviour

- Dataset: generated once per client from a seed (mulberry32 PRNG, no dependency). Same seed,
  same items. Default 5,000 contract-valid movements, newest first, ~30% inbound, pending only
  among the most recent, ~5% flagged, some without image, a few very long names, mostly EUR
  plus USD/GBP/JPY/CHF. Merchants and people are fictional.
- Pagination: `limit` defaults to 20 and is clamped to 100; a non-positive or non-integer
  `limit` is a 400. `nextCursor` is `null` on the last page.
- Cursor: the mock happens to encode an offset (base64), but **clients must treat cursors as
  opaque** and only send back what `nextCursor` returned. Unknown or out-of-range cursors are
  a 400. A real backend can switch to keyset cursors without any client change.
- Responses are serialised copies, so callers cannot mutate the dataset.

### Options (`createMockMovementsHttpClient`)

| Option            | Default | Purpose                                                                  |
| ----------------- | ------- | ------------------------------------------------------------------------ |
| `seed`            | `42`    | Reproducible dataset and failures                                        |
| `total`           | `5000`  | Dataset size; `0` serves an empty list (empty state)                     |
| `latencyMs`       | `400`   | Simulated latency, cancellable through `AbortSignal`; use `0` in tests   |
| `failOnPage`      | none    | 1-based page that always fails with a 503 (error + retry state)          |
| `failureRate`     | `0`     | Share of requests failing with a 503, drawn from the seeded stream       |
| `invalidItemRate` | `0`     | Share of items replaced by contract-violating ones (drop-and-count path) |
| `anchorDate`      | fixed   | Date of the newest movement; fixed so the dataset never depends on "now" |

### Choosing the backend

The composition root (`src/composition/dependencies.ts`) wires the repository from two env variables,
inlined by Expo at build time (put them in `.env.local`, which is gitignored):

| Variable                   | Values           | Default |
| -------------------------- | ---------------- | ------- |
| `EXPO_PUBLIC_API_MODE`     | `mock` \| `http` | `mock`  |
| `EXPO_PUBLIC_API_BASE_URL` | e.g. `https://…` | none    |

`http` without a base URL, or an unknown mode, fails at startup. Dropped-item reports go to
`console.warn` in development only (they carry ids and issue paths, never values).

### Next step: MSW

Once a real backend exists, [MSW](https://mswjs.io/) handlers could serve the same generator
by intercepting `fetch` itself, which would also cover the fetch adapter, headers and status
handling in integration tests. It is not used today because there is no network layer worth
intercepting beyond `createFetchHttpClient`, which already has its own unit tests, and MSW in
React Native needs extra polyfills.
