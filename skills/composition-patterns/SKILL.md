---
name: composition-patterns
description: "Trigger: compound components, boolean prop proliferation, context provider design, component API design, refactoring component variants. React composition patterns that scale (React 19)."
license: MIT
metadata:
  author: vercel
  version: "1.0.0"
---

# React Composition Patterns

Composition patterns for building flexible, maintainable React components. Avoid
boolean prop proliferation by using compound components, lifting state, and
composing internals. These patterns make codebases easier for both humans and AI
agents to work with as they scale.

## When to Apply

Reference these guidelines when:

- Refactoring components with many boolean props
- Building reusable component libraries
- Designing flexible component APIs
- Reviewing component architecture
- Working with compound components or context providers

## Rule Categories by Priority

| Priority | Category                | Impact | Prefix          |
| -------- | ----------------------- | ------ | --------------- |
| 1        | Component Architecture  | HIGH   | `architecture-` |
| 2        | State Management        | MEDIUM | `state-`        |
| 3        | Implementation Patterns | MEDIUM | `patterns-`     |
| 4        | React 19 APIs           | MEDIUM | `react19-`      |

## Quick Reference

### 1. Component Architecture (HIGH)

- `architecture-avoid-boolean-props` - Don't add boolean props to customize
  behavior; use composition
- `architecture-compound-components` - Structure complex components with shared
  context

### 2. State Management (MEDIUM)

- `state-decouple-implementation` - Provider is the only place that knows how
  state is managed
- `state-context-interface` - Define generic interface with state, actions, meta
  for dependency injection
- `state-lift-state` - Move state into provider components for sibling access

### 3. Implementation Patterns (MEDIUM)

- `patterns-explicit-variants` - Create explicit variant components instead of
  boolean modes
- `patterns-children-over-render-props` - Use children for composition instead
  of renderX props

### 4. React 19 APIs (MEDIUM)

> **⚠️ React 19+ only.** Skip this section if using React 18 or earlier.

- `react19-no-forwardref` - Don't use `forwardRef`; use `use()` instead of `useContext()`

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/architecture-avoid-boolean-props.md
rules/state-context-interface.md
```

Each rule file contains:

- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and references

## Project Notes (movements-ui)

- Examples are written for React DOM; translate `div`/`className` to React Native
  `View` + `X.style.ts` styles (see `design-tokens` skill).
- Prefer explicit variants (e.g. `ItemCard` + `ItemCardSkeleton`) over a
  `loading` boolean that swaps the whole render tree.
- Upstream source: vercel composition-patterns (MIT).
- Design-system components stay domain-free and take view-model props (`ItemCard`: title,
  subtitle, amount text + tone, leading, badges, attention, accessibility label). Features adapt
  their entities with a pure mapper plus a thin wrapper (`toItemCardProps` + `MovementCard`), so
  the mapping is unit-tested without rendering and the component is reusable.
- Interactivity is the presence of a handler, not a boolean: `onPress` makes `ItemCard` a button;
  without it the card is a non-pressable summary.
