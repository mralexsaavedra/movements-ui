---
name: rn-testing
description: "Trigger: write test, unit test, component test, hook test, jest, jest-expo, React Native Testing Library, RNTL, Maestro, E2E. Testing criteria and patterns for movements-ui."
license: MIT
metadata:
  author: alexander-saavedra
  version: "1.0"
---

## Activation Contract

Load before writing or reviewing any `*.test.ts(x)` or `e2e/*.yaml` file.

## What Deserves a Test (criteria)

Test it if a regression would show wrong money, hide information, or break navigation of the list.

| Test                                   | Why                                       | Priority |
| -------------------------------------- | ----------------------------------------- | -------- |
| Amount formatting by type + currency   | Wrong sign/currency = user-facing bug     | required |
| Zod validation (valid, invalid, edge)  | Boundary must reject bad payloads         | required |
| DTO → domain mapper                    | Field renames silently break UI           | high     |
| `ItemCard` states + a11y label         | Core visual contract                      | required |
| Infinite query / controller pagination | Cursor bugs = duplicated/missing rows     | high     |
| Token resolver (aliases, cycles)       | Design-system contract                    | medium   |

Do NOT test: StyleSheet values, library internals, snapshot of whole trees.

## Logic Tests

```ts
// shared/formatting/formatAmount.test.ts
describe('formatAmount', () => {
  it.each([
    ['inbound', 12345.5, 'EUR', '+12.345,50\u00A0€'],
    ['outbound', 12345.5, 'EUR', '-12.345,50\u00A0€'],
  ] as const)('formats %s %d %s', (direction, value, currency, expected) => {
    expect(formatAmount({ direction, value, currency, locale: 'es-ES' })).toBe(expected);
  });
});
```

Pin `locale` in tests (note: `es-ES` does not group 4-digit numbers, so `1234,50`); ICU output varies by locale and may use non-breaking spaces (`\u00A0`) —
normalize or assert with those characters explicitly.

```ts
it('rejects unknown movement type', () => {
  const result = movementSchema.safeParse({ ...validDto, type: 'refund' });
  expect(result.success).toBe(false);
});
```

## Component Tests (RNTL)

Query like a user: `getByRole`, `getByLabelText`, `getByText`. Use `testID` only as last resort.

```tsx
it('announces an outbound pending movement', () => {
  render(<ItemCard movement={buildMovement({ direction: 'outbound', isPending: true })} />, {
    wrapper: ThemeProvider,
  });
  expect(screen.getByLabelText(/payment to .* pending/i)).toBeOnTheScreen();
  expect(screen.getByText('Pending')).toBeOnTheScreen();
});

it('falls back to initials when there is no image', () => {
  render(<ItemCard movement={buildMovement({ counterparty: { name: 'Acme Store', imageUrl: null } })} />, {
    wrapper: ThemeProvider,
  });
  expect(screen.getByText('AS')).toBeOnTheScreen();
});
```

- Use builders (`buildMovement(overrides)`) in `features/movements/testing/`, not inline fixtures.
- `jest-expo` preset; `@testing-library/react-native` matchers are built in (v13+); verify setup in T01.

## Hook Tests

Use `renderHook` + `createQueryWrapper` (see `react-query-patterns`), mock repository with
`latencyMs: 0`, assert via `waitFor`.

## Maestro E2E

Flows live in `e2e/` as YAML, one user journey per file, selectors by text or accessibility label.

```yaml
# e2e/movements-list.yaml
appId: com.example.movementsui
---
- launchApp
- assertVisible: "Movements"
- scrollUntilVisible:
    element: { id: "movement-item-45" }
    direction: DOWN
- assertVisible: { id: "movement-item-45" }
```

Run: `maestro test e2e/`. Requires a dev build on a simulator. If not delivered, document the plan
in README (flows, devices, CI integration).
