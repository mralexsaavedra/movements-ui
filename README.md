# movements-ui

A React Native (Expo SDK 57, TypeScript strict) take-home exercise: a token-driven list-item card
and the minimum system around it, using a list of financial movements (inbound and outbound
transactions) as the example domain. It covers a design-system `ItemCard` with every visual state
documented in Storybook, a virtualized and paginated list, an OpenAPI contract consumed through
typed DTOs, runtime validation, a seeded mock backend and a stale-while-revalidate cache, and a
test suite focused on what can break for users.

## Quick start

Requirements: Node, pnpm 11 (pinned in `packageManager`), and Expo Go or an iOS/Android simulator.

```bash
pnpm install
pnpm start          # Expo dev server; press i / a, or scan the QR code with Expo Go
pnpm ios            # same, opening the iOS simulator
pnpm android        # same, opening the Android emulator
```

The app runs against an in-process mock backend by default, so no server or network is needed.
Every native module in use (FlashList, Reanimated, AsyncStorage, `expo-image`, `expo-localization`,
`expo-network`, and the Storybook peers) ships in Expo Go, so a dev build is not required.

| Task                   | Command                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| Storybook (on device)  | `pnpm storybook:start` (or `storybook:ios` / `storybook:android`) |
| Regenerate story index | `pnpm storybook:generate`                                         |
| Tests                  | `pnpm test` · `pnpm test:watch` · `pnpm test:ci`                  |
| Lint / typecheck       | `pnpm lint` · `pnpm typecheck`                                    |
| Format                 | `pnpm format` · `pnpm format:check`                               |
| Design tokens          | `pnpm tokens` (generate) · `pnpm tokens:check` (fail if stale)    |
| Environment health     | `npx expo-doctor`                                                 |

Storybook is a separate root: `pnpm storybook:start` sets `EXPO_PUBLIC_STORYBOOK_ENABLED=true`.
With the flag off, Metro resolves every Storybook module to an empty stub, so none of it reaches
the app bundle. Clear Metro's cache (`expo start -c`) when switching between the two.

### Environment variables

Read by the composition root (`src/composition/dependencies.ts`) and inlined by Expo at build
time. Put them in `.env.local` (gitignored).

| Variable                   | Values           | Default | Effect                                     |
| -------------------------- | ---------------- | ------- | ------------------------------------------ |
| `EXPO_PUBLIC_API_MODE`     | `mock` \| `http` | `mock`  | Seeded in-process backend, or real `fetch` |
| `EXPO_PUBLIC_API_BASE_URL` | e.g. `https://…` | none    | Required when the mode is `http`           |

`http` without a base URL, or an unknown mode, fails at startup rather than on the first request.
`EXPO_PUBLIC_STORYBOOK_ENABLED` is set by the Storybook scripts; there is no need to set it by hand.

## Where each part of the exercise lives

| Part                     | What                                                     | Where                                                                                                                 |
| ------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1 · Component and states | Generic `ItemCard` + `ItemCardSkeleton`, token-driven    | `src/design-system/components/itemCard/`                                                                              |
|                          | Movement → card adapter                                  | `src/features/movements/ui/components/movementCard/`                                                                  |
|                          | Design spec and tokens                                   | `DESIGN.md`, `src/design-system/tokens/`                                                                              |
|                          | Storybook stories (every state, light/dark, es/en)       | `*.stories.tsx` next to each component, `.rnstorybook/`                                                               |
| 2 · List                 | Virtualized, paginated `MovementList` (FlashList v2)     | `src/features/movements/ui/components/movementList/`                                                                  |
|                          | List controller (pagination, refresh, retry, offline)    | `src/features/movements/ui/hooks/useMovementList.ts`                                                                  |
| 3 · Contract             | OpenAPI spec and how it is consumed                      | `contract/openapi.yaml`, `contract/README.md`                                                                         |
|                          | DTOs, Zod schema, mapper, invalid-data policy            | `src/features/movements/infrastructure/{dto,schemas,mappers}/`, `parseMovementsPage.ts`                               |
|                          | Mock backend (seeded transport)                          | `src/features/movements/infrastructure/mock/`                                                                         |
|                          | Stale-while-revalidate cache + persistence               | `src/shared/query/`, `src/shared/storage/`, `src/features/movements/ui/cache/`, `src/composition/queryPersistence.ts` |
| 4 · Testing              | Colocated `*.test.ts(x)`; every story rendered by a test | `src/**`, `src/storybook/stories.test.tsx`                                                                            |

## Architecture

Light hexagonal architecture per feature, plus a shared design system that knows nothing about
the domain.

```
src/
├── design-system/       tokens (DTCG JSON + generated TS), theme, generic components (ItemCard, Badge…)
├── features/movements/
│   ├── domain/          Movement entity, repository port, errors, pure formatting
│   ├── infrastructure/  DTOs, Zod schema, mapper, HTTP repository, mock transport
│   ├── testing/         feature test helpers
│   └── ui/              cache (keys, snapshot, select), components, hooks, providers, views
├── shared/              HTTP client port + fetch adapter, React Query policy, i18n
└── composition/         composition root: picks adapters from env, AppProviders
```

**Dependency rule:** `ui → domain ← infrastructure`. The domain imports nothing from React, fetch,
Zod or React Query. Infrastructure implements domain ports. The UI receives the repository through
a context provider and never instantiates adapters; `src/composition/` is the only place that does.

## Decisions and trade-offs

| Topic          | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Why                                                                                                                                                                                                      | Alternative considered                                                                                                                                                                                 | Cost                                                                                                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design tokens  | Authored W3C DTCG tokens in three layers (primitive → semantic → component), generated into typed TS by Style Dictionary (`pnpm tokens`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | No usable token file or visual design was available, so `DESIGN.md` is the written spec and the tokens implement it. Build-time generation gives exact literal types and no runtime resolver to maintain | Runtime alias resolver (the first version); Terrazzo                                                                                                                                                   | Generated files are committed and must be regenerated with each JSON change (`tokens:check` runs in lint-staged and pre-push)                                                                     |
| Card API       | Generic, domain-free `ItemCard` (title, subtitle, amount + tone, leading image/initials, badges, attention, a11y label) and a feature `MovementCard` adapter with a pure view-model mapper (`toItemCardProps`)                                                                                                                                                                                                                                                                                                                                                                                                                    | The exercise is about the component and its system, not the domain. The design system never learns about money directions or statuses, so it can serve other lists                                       | A `MovementCard` built directly on tokens                                                                                                                                                              | One extra mapping layer to read and test                                                                                                                                                          |
| Contract types | Hand-written `readonly` DTO types mirroring the spec, with a compile-time check that they equal the Zod schema's inferred type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | One endpoint with about ten fields and no backend-published spec to generate from; runtime validation is needed anyway                                                                                   | `openapi-typescript` / `orval` codegen                                                                                                                                                                 | Manual sync when the spec changes (the compile-time check catches drift). Codegen becomes the better call once a backend publishes and versions the spec                                          |
| Validation     | Zod at the infrastructure boundary, stricter than the spec where the UI could not render correctly. Invalid envelope → `ContractError`, the page fails with retry. Invalid item → dropped, counted in `invalidCount` (shown as a notice), and reported through a `ContractViolationReporter` port with id, index and issue paths, never raw values                                                                                                                                                                                                                                                                                | Bad data fails loudly and never reaches the UI; one broken row does not hide a whole page of valid ones; reports carry no financial values                                                               | Fail the whole page on any invalid item; trust the types                                                                                                                                               | Rows can silently go missing for the user, mitigated by the visible "N movements couldn't be shown" notice                                                                                        |
| Mock backend   | Mock at the **transport** (`HttpClient`) boundary: a seeded, deterministic in-process backend (5,000 movements by default, cursor pagination, injectable latency, failures and invalid items)                                                                                                                                                                                                                                                                                                                                                                                                                                     | The real repository, Zod validation, invalid-data policy and mapper run exactly as against a server. Same seed, same data, so tests and stories are reproducible                                         | MSW (needs polyfills in RN, and there is no network layer worth intercepting beyond the fetch adapter, which has its own tests); an in-memory fake repository (would skip the whole contract boundary) | The fetch adapter itself is only covered by unit tests, not by an intercepted end-to-end request                                                                                                  |
| Server state   | TanStack React Query v5 `useInfiniteQuery` with stale-while-revalidate (30 s stale time), retries only for network errors (including the fetch adapter's 10 s request timeout) and 5xx, items deduplicated by id across pages                                                                                                                                                                                                                                                                                                                                                                                                     | Cached data renders instantly and refetches in the background; client errors and contract violations would fail the same way again, so they are not retried                                              | Hand-rolled fetching and caching state                                                                                                                                                                 | A library dependency and its cache semantics to learn                                                                                                                                             |
| Persistence    | The query cache is persisted to AsyncStorage: first page only, 24 h max age, discarded when `MOVEMENTS_CACHE_VERSION` (the buster) changes. A JSON-safe snapshot with ISO dates is stored and revived in `select`; restored snapshots are validated with Zod on restore and dropped when invalid, so the list fetches fresh data. The snapshot is encrypted at rest with AES-256-GCM (`@noble/ciphers`, fresh nonce per write) under a 256-bit key generated once and kept in `expo-secure-store` (device-only keychain/Keystore); a cache that does not decrypt is dropped, and nothing is persisted when the key is unavailable | The list paints from disk on the next launch while fresh data loads; one page keeps writes small and limits financial data at rest                                                                       | No persistence (memory cache only)                                                                                                                                                                     | Pure-JS crypto costs some JS-thread time per write, acceptable for one small page. If the keychain entry is lost (reinstall, restore to another device) the cache is simply dropped and refetched |
| List engine    | FlashList v2 (cell recycling, sizes measured, no `estimatedItemSize`) behind our own `MovementList`, the only file that imports it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Recycling keeps memory and blank areas low on long lists; wrapping it means swapping engines touches one file                                                                                            | FlatList + `getItemLayout` (a valid choice given the fixed-minimum-height rows, and no dependency)                                                                                                     | Extra dependency; rows must hold no local state under recycling; requires the New Architecture                                                                                                    |
| Test runner    | Jest via `jest-expo` + React Native Testing Library v14                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `jest-expo` is the runner Expo supports, with presets for the RN environment and native module mocks                                                                                                     | Vitest (no official React Native support)                                                                                                                                                              | Jest-specific config to maintain (`transformIgnorePatterns` for untranspiled RN packages)                                                                                                         |
| Language       | Bilingual es/en following the device (`expo-localization`): any Spanish locale → `es`, anything else → `en`. Typed dictionaries with key parity; dates and amounts follow the device locale when it speaks the UI language                                                                                                                                                                                                                                                                                                                                                                                                        | Copy, accessibility labels and formatting never mix languages                                                                                                                                            | Spanish only                                                                                                                                                                                           | Two dictionaries to keep in sync (enforced by types and a test). Categories arrive as free text in the contract and are shown untranslated                                                        |
| Money          | `Intl.NumberFormat` with the contract currency (2 decimals for EUR, 0 for JPY), memoised per locale and currency. Inbound `+`, outbound `−` (U+2212, same width as `+`), zero unsigned; the sign is applied at formatting time, not in the mapper                                                                                                                                                                                                                                                                                                                                                                                 | Correct per-currency formatting without a money library; a true minus aligns with tabular numerals and reads as "minus"                                                                                  | Signed amounts in the domain; a formatting library                                                                                                                                                     | Relies on the runtime's `Intl` data                                                                                                                                                               |

The full visual rationale (color roles, state matrix, why red is reserved for errors and not for
spending) is in [`DESIGN.md`](DESIGN.md). Contract details and mock options are in
[`contract/README.md`](contract/README.md).

## Accessibility

- **One element per card.** The card is a single accessible element (`role="button"` when it has an
  action, `"summary"` otherwise) with a spoken label; inner texts and the avatar are not separate
  stops.
- **Spoken labels.** Direction, name, sign word, amount with the currency name, status, attention and
  date, all from the UI dictionaries and `Intl` in the same locale (for example "Incoming, …, plus
  1,250.00 euros, pending, …").
- **State is never color alone.** Sign, "Pending" badge, ⚑ glyph and "Needs attention" text back up
  every color cue.
- **Announcements.** Load and update failures are announced to screen readers
  (`AccessibilityInfo.announceForAccessibility`), again for a repeated failure; the initial load is
  one "Loading movements" element while skeleton rows are hidden from assistive technologies.
- **Reduce motion.** The skeleton pulse stops when the OS setting is on.
- **Contrast.** WCAG AA text (4.5:1) and non-text (3:1) contrast is checked in tests for both themes
  (`src/design-system/theme/buildTheme.test.ts`).
- **Font scaling** stays on, capped at 200 %; rows use a minimum height so scaled text is not clipped.

## Testing strategy

362 tests in 37 suites (`pnpm test:ci`), all deterministic (seeded data, fixed dates and time zone,
no snapshots).

| Level     | What is covered                                                                                                                                                                                                                                                                                                                                | Why                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Logic     | Amount and date formatting, Zod validation and the invalid-data policy, mapper, mock transport (determinism, cursors, failure and invalid-item injection), retry predicate, cache `select` (flatten, dedupe, revive), persistence options, cache encryption (round trip, nonce, tamper, lost key, fail closed), token value kinds and contrast | Money, contract and cache bugs are the ones users would notice or trust less |
| Component | `ItemCard` states, `ItemCardSkeleton`, `MovementCard`, `MovementList` (loading, empty, error, retry banner, offline, pagination, end of list), queried by role, label and text                                                                                                                                                                 | What the user sees and what assistive technologies read                      |
| Hooks     | Infinite query and list controller with a real `QueryClient` and a controllable transport: first page, `loadMore`, end of list, refresh, retry, failed page stops auto-loading                                                                                                                                                                 | Pagination and refresh races are where list screens usually break            |
| Catalog   | `src/storybook/stories.test.tsx` renders every story in light/Spanish and dark/English, asserts it is not empty, and fails on any `console.error`                                                                                                                                                                                              | Stories cannot silently rot; the catalog doubles as a broad smoke test       |

Husky runs lint-staged (oxlint, Prettier, token check) on commit and `tokens:check`, typecheck and
`test:ci` on push. GitHub Actions (`.github/workflows/ci.yml`) runs lint, format, token check,
typecheck and tests on every pull request and on `main`.

### E2E: not included yet

An E2E suite (Maestro) was deliberately left out to spend the time on the core parts. The first
flow would cover:

- App launches against the mock and the first page of movements is visible.
- Scrolling to the bottom loads the next page (the mock serves 5,000 rows) and the end-of-list
  message appears on a short dataset.
- Pull to refresh keeps the rows on screen while revalidating.
- With the mock's `failOnPage` option, the error state appears and "Try again" recovers.
- Relaunching shows the persisted first page instantly before the network answers.

## Time spent

The estimate was 4–6 hours. Grouping commit timestamps into work sessions gives roughly
**10 hours** of elapsed time over three sessions (about 4 h, 4.5 h and 1.5 h, including review
rounds and this README). This is an approximation from commit times, not tracked time.

| Core (what the exercise asks for)                   | Extras (beyond the brief)                                  |
| --------------------------------------------------- | ---------------------------------------------------------- |
| `ItemCard` + skeleton with all states, token-driven | Authored `DESIGN.md` spec and Style Dictionary pipeline    |
| Storybook stories for every state                   | Catalog test rendering every story in both themes          |
| Virtualized, paginated list                         | Bilingual es/en following the device                       |
| Typed DTOs, Zod validation, seeded mock             | Dark mode with contrast tests                              |
| Stale-while-revalidate with React Query             | Persisted first page across launches                       |
| Logic, component and hook tests                     | Offline banner, invalid-item notice, failure announcements |
|                                                     | Git hooks plus a GitHub Actions pipeline                   |

## Known limitations and next steps

- **E2E** with Maestro (plan above).
- **Manual device pass.** Performance with the 5,000-row mock (JS FPS, blank cells) has not been
  measured on a device or dev build, so no numbers are claimed.
- **Design questions** (currency display, relative dates, flagged semantics, icon set) are listed
  in `DESIGN.md` §9.

## AI usage

This project was built with an AI coding agent working under the author's direction. The author
made the product and architecture decisions, reviewed every change, and verified the results
(tests, type checks and manual review) before merging.
