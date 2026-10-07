# movements-ui — Agent Instructions

Single source of truth for AI agents. `CLAUDE.md` is a symlink to this file.

## Project Purpose

Take-home exercise for a mobile frontend role (digital banking context). A React Native
app that renders a list of financial **movements** (inbound/outbound transactions):

1. `ItemCard` component driven by design tokens, with every visual state, documented in Storybook.
2. A virtualized, paginated list able to handle thousands of rows.
3. Integration with a simplified OpenAPI contract (`GET /items`) through typed DTOs, runtime validation, a mock backend and a stale-while-revalidate cache.
4. Meaningful tests (logic + component), plus an E2E flow or a documented plan.

The deliverable is a public GitHub repo + README that defends trade-offs.

## Confidentiality (MANDATORY)

- NEVER name the client, bank, or hiring company in code, commits, docs, or stories.
- NEVER commit the exercise statement or the job offer (PDFs or copies). Paraphrase, never quote verbatim.
- Mock data uses fictional merchants and people only.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. Before touching any Expo, EAS, or React Native API:

1. Read the major version of `expo` in `package.json` (currently SDK 57).
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt and follow its links; never answer from memory.

Generic Expo skills come from the `expo@claude-plugins-official` plugin enabled in
`.claude/settings.json`. Do not vendor them into `skills/`.

## Stack

| Concern         | Choice                                                    |
| --------------- | --------------------------------------------------------- |
| Runtime         | Expo SDK 57, React 19.2, React Native 0.86                |
| Language        | TypeScript strict (see `tsconfig.json`)                   |
| Server state    | TanStack React Query v5 (`useInfiniteQuery`, cursor)      |
| Validation      | Zod at the infrastructure boundary                        |
| Lists           | FlashList vs FlatList — **open decision**, record in README |
| Tests           | Jest (`jest-expo`) + `@testing-library/react-native`      |
| E2E             | Maestro (`e2e/`)                                          |
| Docs            | Storybook for React Native                                |
| Package manager | pnpm (`nodeLinker: hoisted`)                              |
| Lint / format   | oxlint + Prettier, Husky + lint-staged                    |

## Commands

Always add native-aware deps with `npx expo install <pkg>` (resolves SDK-compatible versions), never plain `pnpm add` for Expo/RN packages.

| Task          | Command                       | Status |
| ------------- | ----------------------------- | ------ |
| Install       | `pnpm install`                | ready  |
| Start         | `pnpm start` (`expo start`)   | ready  |
| iOS / Android | `pnpm ios` / `pnpm android`   | ready  |
| Lint          | `pnpm lint`                   | TODO (T01) |
| Format        | `pnpm format`                 | TODO (T01) |
| Typecheck     | `pnpm typecheck`              | TODO (T01) |
| Test          | `pnpm test`                   | TODO (T01) |
| Storybook     | `pnpm storybook`              | TODO (T07) |
| E2E           | `pnpm e2e` (`maestro test e2e/`) | TODO (T09) |
| Doctor        | `npx expo-doctor`             | ready  |

Run lint, typecheck and tests before declaring any task done (once the scripts exist).

## Architecture

Light hexagonal architecture **per feature**, plus a shared design system.

```
src/
├── design-system/
│   ├── tokens/          # DTCG JSON (primitive → semantic → component)
│   ├── theme/           # typed theme built from tokens, ThemeProvider, useTheme
│   └── components/      # generic primitives (Text, Skeleton, Avatar…)
├── features/
│   └── movements/
│       ├── domain/          # entities, value objects, repository port, pure logic
│       ├── infrastructure/  # DTO types, Zod schemas, mappers, HTTP repo, mock adapter
│       └── ui/
│           ├── components/  # presentational (itemCard/, movementList/)
│           ├── hooks/       # query hooks + controller hooks
│           └── views/       # screens composing hooks + components
└── shared/              # cross-feature utils (formatting, queryClient, testing)
```

### Dependency rule

`ui → domain ← infrastructure`. Domain imports nothing from React, fetch, Zod, or React Query.
Infrastructure implements domain ports. UI talks to domain types and receives the repository via
injection (provider/context), never instantiating adapters inside components.

### Code conventions

- Path alias `@/` → `src/`. Named exports only. `import type` for types. No `any`.
- Props are `readonly`. Presentational components never fetch data.
- Component folders camelCase, files PascalCase:
  `itemCard/{ItemCard.tsx, ItemCard.style.ts, ItemCard.stories.tsx, ItemCard.test.tsx, index.ts}`.
- One hook per file. `queryKeys` factory centralized and `as const`.
- Navigation is out of scope unless a second screen becomes necessary (no Expo Router by default).

## Design Tokens Rules

- Tokens live in `src/design-system/tokens/*.json` using the W3C Design Tokens (DTCG) format.
- Assumption: no token file was provided, so we author one. Document this in the README.
- Three layers: **primitive** (raw palette/scale) → **semantic** (intent: `color.text.positive`) → **component** (`itemCard.padding`).
- Components consume **semantic/component** tokens only, never primitives, never literals.
- No hardcoded colors, spacing, radii, font sizes, or durations in components. Ever.
- Styles live in `X.style.ts`, exporting `style(theme)` that returns `StyleSheet.create(...)`.

## Data & Contract Rules

- Contract: `GET /items?cursor&limit=20` → `{ items: Item[], nextCursor: string | null }`.
- DTO types are written manually, `readonly`, mirroring the contract exactly (rationale vs codegen in the `api-contract` skill).
- Every payload is parsed with Zod at the boundary; invalid data fails loudly, never leaks into UI.
- Mappers convert DTO → domain (e.g. ISO string → `Date`, `type` → `direction`); the sign is applied at formatting time.
- The app runs against a deterministic mock adapter, not a real backend.
- Money is formatted with `Intl.NumberFormat` using the contract currency.
- React Query provides stale-while-revalidate: cached data renders instantly, refetch in background.

## Testing Criteria

Test behavior that can break and matters to users, not implementation details.

- **Logic (required)**: amount formatting by type/currency, Zod payload validation, mappers.
- **Component (required)**: `ItemCard` states rendered and accessible (query by role/label/text).
- **Hooks**: pagination/next-cursor behavior with a QueryClient wrapper (`retry: false`).
- **E2E (bonus)**: Maestro flow — list loads, scrolls, paginates.
- Tests are colocated `*.test.ts(x)`. No snapshot spam. Deterministic data only.

## Expo Rules

- `ios/` and `android/` are generated (Continuous Native Generation). Never create or edit them by hand — configure via `app.json` and config plugins.
- Expo Go only bundles its own native modules; libraries with native code need a dev build (`npx expo run:ios|android`).
- Prefer Expo modules over third-party libraries when equivalent.

## Git Conventions

- Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`).
- NO AI attribution, NO `Co-Authored-By` trailers.
- One branch per work unit; commits keep code + tests + docs together.
- Never commit secrets, PDFs of the exercise/offer, or `odd/` process notes.

## Skills (auto-invoke)

Load the matching `SKILL.md` BEFORE acting. Run `./skills/setup.sh` to link them into `.claude/skills/`.

| Action                                                       | Skill                                      |
| ------------------------------------------------------------ | ------------------------------------------ |
| Deciding where a file goes, adding a layer, naming           | `skills/movements-architecture/SKILL.md`   |
| Adding/using tokens, theme, writing `X.style.ts`             | `skills/design-tokens/SKILL.md`            |
| DTO types, Zod schemas, mappers, mock adapter, repository    | `skills/api-contract/SKILL.md`             |
| Query keys, infinite queries, cache config, controller hooks | `skills/react-query-patterns/SKILL.md`     |
| Writing unit/component/hook tests, Maestro flows             | `skills/rn-testing/SKILL.md`               |
| Writing or updating stories                                  | `skills/storybook-rn/SKILL.md`             |
| List virtualization, pagination, scroll performance          | `skills/rn-list-performance/SKILL.md`      |
| Component API design, variants, compound components          | `skills/composition-patterns/SKILL.md`     |
| Expo SDK APIs, upgrades, native UI, deployment               | `expo@claude-plugins-official` plugin skills |

Skill index: `.atl/skill-registry.md`.
