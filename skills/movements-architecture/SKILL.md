---
name: movements-architecture
description: "Trigger: where does X go, new file, new feature, layer, folder structure, naming, imports between layers. Light hexagonal architecture per feature for movements-ui."
license: MIT
metadata:
  author: alexander-saavedra
  version: "1.0"
---

## Activation Contract

Load before creating any file under `src/` or moving code between folders.

## Layout

```
src/
├── design-system/{tokens,theme,components}   # shared, feature-agnostic
├── features/<feature>/
│   ├── domain/           # entities, value objects, ports, pure functions
│   ├── infrastructure/   # dto/, schemas/, mappers/, repositories/ (http), mock/ (fake transport)
│   └── ui/{components,hooks,views}
├── shared/               # http/ (HttpClient port + fetch adapter), testing (cross-feature only)
└── composition/          # composition root: picks adapters from env (dependencies.ts)
```

## Dependency Rule

| Layer            | May import                                   | Must NOT import                               |
| ---------------- | -------------------------------------------- | --------------------------------------------- |
| `domain`         | other domain files, `shared` pure utils      | React, RN, fetch, Zod, React Query, infra, ui |
| `infrastructure` | `domain`, Zod, `shared`                      | `ui`, React components                        |
| `ui`             | `domain` types, `design-system`, React Query | concrete adapters (inject them)               |
| `design-system`  | tokens, RN                                   | any `features/*`                              |
| `composition`    | everything (wires adapters)                  | — (keep it to wiring; no logic)               |

Repository implementations are injected through a provider so tests/stories can swap them:

```ts
// domain/MovementRepository.ts
import type { MovementsPage } from "./Movement";

export interface MovementRepository {
  readonly getMovements: (params: GetMovementsParams) => Promise<MovementsPage>;
}
```

```tsx
// ui/providers/MovementRepositoryProvider.tsx
const MovementRepositoryContext = createContext<MovementRepository | null>(null);

export const useMovementRepository = (): MovementRepository => {
  const repo = use(MovementRepositoryContext);
  if (!repo) throw new Error("MovementRepositoryProvider missing");
  return repo;
};
```

## Where New Files Go

| You are adding…                   | Location                                          |
| --------------------------------- | ------------------------------------------------- |
| Business type / rule (no I/O)     | `features/movements/domain/`                      |
| Movement formatting (amount/date) | `features/movements/domain/formatting/`           |
| Contract type mirroring JSON      | `features/movements/infrastructure/dto/`          |
| Zod schema                        | `features/movements/infrastructure/schemas/`      |
| DTO → domain conversion           | `features/movements/infrastructure/mappers/`      |
| HTTP repository                   | `features/movements/infrastructure/repositories/` |
| Mock transport / seeded data      | `features/movements/infrastructure/mock/`         |
| Generic transport (HTTP client)   | `shared/http/`                                    |
| Adapter wiring, env, console      | `composition/dependencies.ts` (composition root)  |
| Presentational feature component  | `features/movements/ui/components/<camelName>/`   |
| Query or controller hook          | `features/movements/ui/hooks/use<Name>.ts`        |
| Screen                            | `features/movements/ui/views/<Name>View.tsx`      |
| Reusable visual primitive         | `design-system/components/<camelName>/`           |
| Cross-feature pure helper         | `shared/<area>/`                                  |

## Naming

- Component folder camelCase, files PascalCase: `itemCard/ItemCard.tsx`, `ItemCard.style.ts`,
  `ItemCard.stories.tsx`, `ItemCard.test.tsx`, `index.ts` (re-export only).
- Hooks: `useMovementsInfiniteQuery.ts` (data), `useMovementListController.ts` (UI orchestration).
- DTOs suffixed `Dto` (`MovementDto`); domain entities unsuffixed (`Movement`).
- Named exports only, `import type` for types, `@/` alias for cross-folder imports.

## Rules

- Formatting that depends on movement concepts (direction → sign) lives in the feature's
  `domain/formatting/`; `shared/` must never import from `features/*`.
- Presentational components receive data via `readonly` props; they never call hooks that fetch.
- Views compose controller hooks + presentational components.
- No barrel files beyond a component's own `index.ts`.
- If a file needs two layers' imports that the table forbids, the code is in the wrong layer.
