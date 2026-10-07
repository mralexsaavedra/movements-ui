# Skill Registry — movements-ui

Last updated: 2026-10-07

## Contract

**Delegator use only.** This registry is an index, not a summary. An agent that launches
subagents reads it to select relevant skills, then passes exact `SKILL.md` paths for the
subagent to read before work. `SKILL.md` remains the source of truth.

Project skills live in `skills/` and are linked into `.claude/skills/` by `./skills/setup.sh`.

## Project Skills

| Name | Trigger / description | Path |
| ---- | --------------------- | ---- |
| movements-architecture | where does X go, new file, layer, folder structure, naming, imports between layers | `skills/movements-architecture/SKILL.md` |
| design-tokens | design tokens, theme, colors, spacing, `X.style.ts`, adding a token, hardcoded value | `skills/design-tokens/SKILL.md` |
| api-contract | OpenAPI contract, DTO, Zod schema, payload validation, mapper, mock adapter, repository port | `skills/api-contract/SKILL.md` |
| react-query-patterns | React Query, useInfiniteQuery, queryKeys, cache, staleTime, SWR, controller hook, test wrapper | `skills/react-query-patterns/SKILL.md` |
| rn-testing | unit/component/hook tests, jest-expo, RNTL, Maestro, E2E | `skills/rn-testing/SKILL.md` |
| storybook-rn | Storybook, stories, component states, decorators, args | `skills/storybook-rn/SKILL.md` |
| rn-list-performance | FlatList/FlashList, virtualization, infinite scroll, pagination, pull to refresh, skeleton | `skills/rn-list-performance/SKILL.md` |
| composition-patterns | compound components, boolean prop proliferation, component API design (vercel, MIT) | `skills/composition-patterns/SKILL.md` |

## Plugin Skills

| Source | Trigger / description | Path |
| ------ | --------------------- | ---- |
| `expo@claude-plugins-official` | Expo SDK APIs, upgrades, native UI, dev client, EAS deployment | enabled in `.claude/settings.json` (not vendored) |
