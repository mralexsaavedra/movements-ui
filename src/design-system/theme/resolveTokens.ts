/**
 * Pure resolver for W3C Design Tokens (DTCG) trees.
 *
 * - A token is any object with a `$value`; every other object is a group.
 * - Keys starting with `$` (`$type`, `$description`) are metadata and are dropped from the output.
 * - A value that is exactly `{path.to.token}` is an alias, resolved against every token in `scope`
 *   (aliases may chain). Unknown references, cycles and duplicate paths throw descriptive errors.
 */

export type TokenValue = string | number;

export interface TokenLeaf {
  readonly $value: TokenValue;
  readonly $type?: string;
  readonly $description?: string;
}

export interface TokenGroup {
  readonly [key: string]: TokenGroup | TokenLeaf | string;
}

export interface ResolvedTokens {
  readonly [key: string]: ResolvedTokens | TokenValue;
}

const ALIAS = /^\{([^{}]+)\}$/;

const isLeaf = (node: unknown): node is TokenLeaf =>
  typeof node === "object" && node !== null && "$value" in node;

const isGroup = (node: unknown): node is TokenGroup =>
  typeof node === "object" && node !== null && !isLeaf(node);

const childEntries = (group: TokenGroup) =>
  Object.entries(group).filter(([key]) => !key.startsWith("$"));

/** Flattens a DTCG tree into `path -> raw $value`. Throws on paths defined twice. */
export function flattenTokens(
  group: TokenGroup,
  into: Map<string, TokenValue> = new Map(),
  prefix = "",
): Map<string, TokenValue> {
  for (const [key, node] of childEntries(group)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isLeaf(node)) {
      if (into.has(path)) throw new Error(`Duplicate token path "${path}"`);
      into.set(path, node.$value);
    } else if (isGroup(node)) {
      flattenTokens(node, into, path);
    }
  }
  return into;
}

function resolveValue(
  path: string,
  value: TokenValue,
  lookup: ReadonlyMap<string, TokenValue>,
  chain: readonly string[],
): TokenValue {
  const reference = typeof value === "string" ? ALIAS.exec(value)?.[1] : undefined;
  if (reference === undefined) return value;

  if (chain.includes(reference)) {
    throw new Error(`Token reference cycle: ${[...chain, reference].join(" -> ")}`);
  }
  const target = lookup.get(reference);
  if (target === undefined) {
    throw new Error(`Unknown token reference "${value}" in "${path}"`);
  }
  return resolveValue(reference, target, lookup, [...chain, reference]);
}

/**
 * Resolves every token of `tokens` into a plain nested object of concrete values.
 * `scope` lists all layers aliases may point to (usually primitive + semantic + `tokens`).
 */
export function resolveTokens(tokens: TokenGroup, scope: readonly TokenGroup[]): ResolvedTokens {
  const lookup = new Map<string, TokenValue>();
  for (const layer of scope) flattenTokens(layer, lookup);

  const walk = (group: TokenGroup, prefix: string): ResolvedTokens => {
    const out: Record<string, ResolvedTokens | TokenValue> = {};
    for (const [key, node] of childEntries(group)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (isLeaf(node)) out[key] = resolveValue(path, node.$value, lookup, [path]);
      else if (isGroup(node)) out[key] = walk(node, path);
    }
    return out;
  };

  return walk(tokens, "");
}
