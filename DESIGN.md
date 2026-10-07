# DESIGN.md — Movements UI design specification

## 1. Purpose and assumption

No visual design (Figma or similar) and no usable token file were available for this exercise.
This document is therefore the **authored source of truth** for the visual system. The DTCG token
files in `src/design-system/tokens/` implement it one-to-one; if the two disagree, this document
wins and the tokens are fixed.

Scope: one component (`ItemCard`) and its list, in a digital banking "movements" context.

## 2. Principles

| Principle                           | What it means in practice                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| Clarity of money                    | Amount is the strongest element on the right; explicit sign; tabular numerals; never cut.   |
| Trust and calm                      | Neutral surfaces, one accent per state. Red is reserved for errors, not for spending money. |
| State never conveyed by color alone | Every state has a text or glyph cue (sign, badge, icon) in addition to color.               |
| Density vs readability              | Two text lines per row, 72dp minimum height: scannable lists without cramped rows.          |
| Accessibility first                 | WCAG AA contrast, Dynamic Type support, one accessible element per row, 44dp touch targets. |

## 3. Token architecture

```
primitive  ──►  semantic (light | dark)  ──►  component
color.green.600   color.text.positive         itemCard.amountInboundColor
space.4           spacing.md                  itemCard.paddingHorizontal
```

| Layer     | File(s)                                       | Contains                                     | Consumed by                 |
| --------- | --------------------------------------------- | -------------------------------------------- | --------------------------- |
| Primitive | `primitive.json`                              | Raw palette ramps and scales, no meaning     | Semantic tokens only        |
| Semantic  | `semantic.json`, `semantic.{light,dark}.json` | Intent: `color.text.positive`, `spacing.md`  | Components, component layer |
| Component | `component.json`                              | Per-component decisions: `itemCard.padding*` | That component only         |

- **Naming**: `category.role.variant` in camelCase segments (`color.status.pending.text`,
  `itemCard.amountPendingColor`).
- **Why components never read primitives**: a primitive says _what_ a value is (`green.600`), a
  semantic token says _why_ it is used (`text.positive`). Theming, dark mode and rebranding remap
  the semantic layer; components that skipped it would silently keep the old value.
  A test enforces that component tokens alias semantic tokens only.
- **Format**: W3C Design Tokens Community Group (DTCG) — `$value`, `$type`, aliases as
  `{path.to.token}`. Aliases may chain; unknown references and collisions fail the token build.
- **Units (deviation)**: DTCG `dimension` and `duration` values are formally unit-bearing
  (`"16px"`, `"250ms"`). We store **unitless numbers** because React Native styles use
  density-independent pixels (dp) and animation APIs take milliseconds. Any export to web tooling
  must append units.
- **Themes**: `semantic.json` holds mode-independent intent (spacing, radius, typography, motion).
  `semantic.light.json` and `semantic.dark.json` remap the same `color.*` keys onto the same
  primitives. Light and dark must expose identical keys (checked at compile time and in tests).
- **Pipeline (build time)**:

  ```
  tokens/*.json (DTCG) ──► Style Dictionary (`pnpm tokens`) ──► tokens/generated/{light,dark}.ts ──► ThemeProvider
  ```

  `scripts/build-tokens.mjs` runs [Style Dictionary](https://styledictionary.com) once per mode
  (`primitive` as alias scope only; `semantic` + `semantic.<mode>` + `component` as output) and
  writes a nested `export const lightTokens = { ... } as const` module, formatted with Prettier.
  No value transforms run, so the unitless convention above survives. Generated files are
  committed, so Metro, Jest and `tsc` need no pre-step and reviewers can read the resolved values;
  `pnpm tokens:check` (pre-push and lint-staged) fails when they are stale.

- **Why build time, not runtime**: resolving aliases in the app means shipping and testing a
  bespoke resolver, and JSON imports widen every `$value` to `string`, which forced a hand-written
  `Theme` interface kept in sync by type-level checks. Generated code has exact literal types, so
  `Theme` is derived from it (`typeof lightTokens`, widened so both modes share one type), and
  Style Dictionary is the standard tool a design-system team already knows. **Terrazzo** (DTCG
  native) was considered; Style Dictionary won on ecosystem maturity and familiarity.
- **Typed theme**: `buildTheme(mode)` returns the generated tokens plus `mode`, deeply frozen.
  A compile-time assertion keeps the light and dark modules identical in shape; a test checks
  every value kind against its source `$type` and WCAG contrast in both modes.

## 4. Foundations

### Color roles (semantic)

| Token                                      | Light (primitive) | Dark (primitive)  | Use                        |
| ------------------------------------------ | ----------------- | ----------------- | -------------------------- |
| `color.background.default`                 | neutral.50        | neutral.950       | Screen background          |
| `color.surface.default`                    | neutral.0         | neutral.900       | Card surface               |
| `color.surface.muted`                      | neutral.100       | neutral.800       | Avatar fallback, skeleton  |
| `color.surface.attention`                  | amber.100         | amber.900         | Attention tint             |
| `color.text.primary`                       | neutral.900       | neutral.50        | Titles, outbound amounts   |
| `color.text.secondary`                     | neutral.600       | neutral.400       | Subtitles, pending amounts |
| `color.text.positive`                      | green.600         | green.400         | Inbound amounts            |
| `color.text.attention`                     | amber.700         | amber.400         | "Needs attention" text     |
| `color.text.critical`                      | red.700           | red.400           | Errors only                |
| `color.border.default`                     | neutral.200       | neutral.700       | Card border                |
| `color.border.attention`                   | amber.700         | amber.400         | Flagged accent border      |
| `color.icon.attention`                     | amber.700         | amber.400         | Flag glyph                 |
| `color.status.pending.{background,text}`   | neutral.100 / 700 | neutral.800 / 200 | Pending badge              |
| `color.status.attention.{background,text}` | amber.100 / 900   | amber.900 / 100   | Attention badge            |

### Typography

| Token                | Size | Line height | Weight | Use                        |
| -------------------- | ---- | ----------- | ------ | -------------------------- |
| `typography.title`   | 16   | 24          | 600    | Counterparty name          |
| `typography.body`    | 14   | 20          | 400    | General text               |
| `typography.caption` | 12   | 16          | 400    | Subtitle (category · date) |
| `typography.amount`  | 16   | 24          | 600    | Amount, tabular numerals   |
| `typography.badge`   | 12   | 16          | 500    | Status badges              |

Dynamic Type policy: `allowFontScaling` stays on everywhere; text sets
`maxFontSizeMultiplier = typography.maxFontSizeMultiplier` (2, i.e. 200 % as WCAG 1.4.4 asks).
Rows grow vertically (`minHeight`, never fixed `height`) so scaled text is not clipped.

### Spacing (4 pt grid), radius, borders, sizes

| Spacing        | dp  | Radius        | dp  | Border / size          | dp  |
| -------------- | --- | ------------- | --- | ---------------------- | --- |
| `spacing.none` | 0   | `radius.sm`   | 4   | `borderWidth.hairline` | 1   |
| `spacing.xxs`  | 4   | `radius.md`   | 8   | `borderWidth.accent`   | 4   |
| `spacing.xs`   | 8   | `radius.lg`   | 12  | `size.icon`            | 16  |
| `spacing.sm`   | 12  | `radius.pill` | 999 | `size.avatar`          | 40  |
| `spacing.md`   | 16  |               |     | `size.touchTarget`     | 44  |
| `spacing.lg`   | 24  |               |     | `size.listItemMin`     | 72  |
| `spacing.xl`   | 32  |               |     |                        |     |

Elevation: none. Cards are separated by a hairline border, which reads the same in light and dark
and avoids platform shadow differences.

### Motion

| Token                           | Value   | Use                                  |
| ------------------------------- | ------- | ------------------------------------ |
| `motion.duration.fast`          | 150 ms  | Press feedback                       |
| `motion.duration.base`          | 250 ms  | Content fade-in                      |
| `motion.duration.skeletonPulse` | 1000 ms | One skeleton pulse (opacity 0.4 ↔ 1) |

When the OS "reduce motion" setting is on, the skeleton renders static at `opacity.skeletonMax`.

## 5. ItemCard anatomy

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ┌────┐  Acme Payroll                         +1.250,00 €    ┃
┃ │ AP │  Salary · 3 Oct                        [Pending]     ┃
┃ └────┘  ⚑ Needs attention                                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  leading   title (1 line, ellipsis)         amount (never truncated)
            subtitle: category · date       status badge
            attention line (flagged only)
```

- Leading: image, else initials from `label.name`, else a category glyph.
- Flagged cards replace the left hairline with a thick accent border (`┃` above).

| Part      | Tokens                                                              | Rule                                 |
| --------- | ------------------------------------------------------------------- | ------------------------------------ |
| Container | `itemCard.{background,borderColor,borderWidth,radius,padding*,gap}` | `minHeight: itemCard.minHeight` (72) |
| Leading   | `itemCard.avatar{Size,Radius,Background,TextColor}`                 | Up to 2 initials, uppercase          |
| Title     | `typography.title`, `itemCard.titleColor`                           | `numberOfLines={1}`, tail ellipsis   |
| Subtitle  | `typography.caption`, `itemCard.subtitleColor`                      | `numberOfLines={1}`                  |
| Amount    | `typography.amount`, `itemCard.amount*Color`                        | Shrinks title column, never itself   |
| Flag      | `itemCard.flagged{AccentColor,AccentWidth}`, `itemCard.flagIcon*`   | Icon + text, not color only          |

The whole card is one pressable area at least `size.touchTarget` (44) tall.

## 6. State matrix

| State             | Visual treatment                         | Tokens                                                  | Non-color cue              | Accessibility label fragment |
| ----------------- | ---------------------------------------- | ------------------------------------------------------- | -------------------------- | ---------------------------- |
| Inbound           | Amount in positive color                 | `itemCard.amountInboundColor`                           | `+` sign                   | "Incoming", "plus …"         |
| Outbound          | Amount in primary text color             | `itemCard.amountOutboundColor`                          | `−` sign (U+2212)          | "Outgoing", "minus …"        |
| Pending           | Amount muted + badge                     | `itemCard.amountPendingColor`, `badge.pending*`         | "Pending" badge text       | "pending"                    |
| Confirmed         | Default treatment, no badge              | —                                                       | Absence of badge           | (nothing added)              |
| Flagged           | Accent left border + flag icon + text    | `itemCard.flagged*`, `itemCard.flagIcon*`               | ⚑ icon + "Needs attention" | "needs attention"            |
| Pending + flagged | Both cues; attention line below subtitle | union of the above                                      | badge + icon + text        | "pending, needs attention"   |
| Long text         | Title/subtitle ellipsized, amount intact | —                                                       | Full text in a11y label    | full name, untruncated       |
| No image          | Initials on muted circle                 | `itemCard.avatarBackground`, `itemCard.avatarTextColor` | Initials                   | (avatar hidden from a11y)    |
| Loading           | Skeleton blocks in card layout, pulsing  | `skeleton.*`                                            | —                          | "Loading movements" (list)   |

Decisions:

- Inbound uses the positive color **and** an explicit `+`; outbound uses the default text color and
  a true minus `−`. Spending is normal, not an error, so red stays reserved for failures.
- Amounts use `fontVariant: ["tabular-nums"]` so digits align across rows.
- Pending lowers emphasis (secondary color) rather than hiding the amount.

## 7. Accessibility

- **One element per card**: the card is `accessible` with `accessibilityRole="button"` (or
  `"summary"` when not pressable); inner texts and the avatar are not separate stops.
- **Label template**: `{direction}, {name}, {sign word} {amount spoken}, {status?}, {attention?}, {date}`
  — e.g. "Incoming, Acme Payroll, plus 1.250,00 euros, pending, needs attention, 3 October".
- **Contrast**: text ≥ 4.5:1 (WCAG 1.4.3); non-text indicators ≥ 3:1 (WCAG 1.4.11) —
  `itemCard.flaggedAccentColor` against the card and the screen background, and
  `itemCard.flagIconColor` against the card — in both themes; enforced by `buildTheme.test.ts`.
  The decorative hairline card border (`itemCard.borderColor`) is exempt.
- **Font scaling**: see Typography; layout tested at 200 %.
- **Touch targets**: ≥ 44 × 44 dp (`size.touchTarget`).

## 8. Open questions for the design team

1. Currency display: symbol vs ISO code, position, and decimals for zero-decimal currencies
   (JPY) — follow device locale or account locale?
2. Dates: relative ("Today", "Yesterday") vs absolute; grouping the list by day with sticky headers?
3. Flagged semantics: what triggers it, can the user act on it (swipe, detail screen), and does it
   persist after review?
4. Should pending outbound amounts count against the displayed balance (affects emphasis)?
5. Category glyph set: is there an icon library, or do we keep initials as the only fallback?
6. Brand palette: are these neutral/green/amber ramps placeholders to be replaced by brand tokens?
