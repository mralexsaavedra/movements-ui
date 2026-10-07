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
