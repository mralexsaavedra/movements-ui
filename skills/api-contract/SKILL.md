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

## 1. DTO Types (manual, readonly)

```ts
// infrastructure/dto/MovementDto.ts
export type MovementTypeDto = 'inbound' | 'outbound';
export type MovementStatusDto = 'pending' | 'confirmed';

export interface MovementDto {
  readonly id: string;
  readonly type: MovementTypeDto;
  readonly status: MovementStatusDto;
  readonly amount: { readonly value: number; readonly currency: string };
  readonly label: { readonly name: string; readonly imageUrl: string | null };
  readonly category: string;
  readonly date: string;
  readonly flagged: boolean;
}

export interface MovementPageDto {
  readonly items: readonly MovementDto[];
  readonly nextCursor: string | null;
}
```

**Why manual, not `openapi-typescript`:** one endpoint, ~10 fields; codegen adds a build step and
tooling for little gain. We still need Zod for runtime safety, so the schema plus a compile-time
assertion keeps types and validator in sync. With a real, growing spec, switch to codegen
(`openapi-typescript` or `orval`/`zod` generation) and keep the mapper layer unchanged.

## 2. Zod Schema at the Boundary

```ts
// infrastructure/schemas/movementSchema.ts
import { z } from 'zod';

export const movementSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['inbound', 'outbound']),
  status: z.enum(['pending', 'confirmed']),
  amount: z.object({ value: z.number().nonnegative(), currency: z.string().length(3) }),
  label: z.object({ name: z.string(), imageUrl: z.url().nullable() }),
  category: z.string(),
  date: z.iso.datetime({ offset: true }),
  flagged: z.boolean(),
});

export const movementPageSchema = z.object({
  items: z.array(movementSchema),
  nextCursor: z.string().nullable(),
});

// Drift guard: fails to compile if DTO and schema diverge.
type _Assert = z.infer<typeof movementPageSchema> extends MovementPageDto ? true : never;
```

Validate with `safeParse`; on failure throw a typed `InvalidPayloadError` (domain error) carrying
the Zod issues. Decide (and document) whether one bad item fails the page or is dropped+logged.

## 3. Mapper DTO → Domain

```ts
// infrastructure/mappers/toMovement.ts
export const toMovement = (dto: MovementDto): Movement => ({
  id: dto.id,
  direction: dto.type,
  isPending: dto.status === 'pending',
  amount: { value: dto.amount.value, currency: dto.amount.currency },
  counterparty: { name: dto.label.name, imageUrl: dto.label.imageUrl },
  category: dto.category,
  date: new Date(dto.date),
  needsAttention: dto.flagged,
});
```

Domain never sees DTOs; UI never sees DTOs.

## 4. Repository Port + Adapters

```ts
// domain/MovementRepository.ts
export interface MovementRepository {
  readonly list: (p: { readonly cursor?: string; readonly limit: number }) => Promise<MovementPage>;
}
```

HTTP adapter: `fetch` → `json()` → `movementPageSchema.parse` → `toMovement`.

## 5. Mock Adapter (deterministic)

```ts
// infrastructure/repositories/createMockMovementRepository.ts
interface MockOptions {
  readonly seed?: number;          // same seed => same dataset
  readonly total?: number;         // e.g. 5000 rows
  readonly latencyMs?: number;     // simulate network
  readonly failRate?: number;      // 0..1 error injection
}

export const createMockMovementRepository = (opts: MockOptions = {}): MovementRepository => {
  const { seed = 42, total = 5000, latencyMs = 400, failRate = 0 } = opts;
  const rng = mulberry32(seed);
  const dataset = Array.from({ length: total }, (_, i) => generateMovementDto(rng, i));

  return {
    list: async ({ cursor, limit }) => {
      await delay(latencyMs);
      if (rng() < failRate) throw new NetworkError('Injected failure');
      const start = cursor ? Number(decodeCursor(cursor)) : 0;
      const items = dataset.slice(start, start + limit);
      const next = start + limit < total ? encodeCursor(String(start + limit)) : null;
      // Pass through the SAME schema + mapper as HTTP to exercise the boundary.
      const page = movementPageSchema.parse({ items, nextCursor: next });
      return { items: page.items.map(toMovement), nextCursor: page.nextCursor };
    },
  };
};
```

- Cursor is opaque (base64 offset), never a page number exposed to UI.
- Generator covers every state: long names, `imageUrl: null`, flagged, pending, multiple currencies.
- Alternative is MSW intercepting `fetch`; record the choice and rationale in the ODD doc/README.
