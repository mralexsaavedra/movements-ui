import component from "../tokens/component.json";
import primitive from "../tokens/primitive.json";
import semanticDark from "../tokens/semantic.dark.json";
import semantic from "../tokens/semantic.json";
import semanticLight from "../tokens/semantic.light.json";
import { buildTheme } from "./buildTheme";

type Leaves = Record<string, unknown>;
interface TokenGroup {
  readonly [key: string]: unknown;
}

const leaves = (node: unknown, prefix = "", out: Leaves = {}): Leaves => {
  if (typeof node !== "object" || node === null) {
    out[prefix] = node;
    return out;
  }
  for (const [key, child] of Object.entries(node)) {
    leaves(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
};

/** Flattens source DTCG JSON into `path -> token` (the generated theme drops `$type`). */
const sourceTokens = (
  group: TokenGroup,
  prefix = "",
  out: Map<string, { readonly $value: unknown; readonly $type: unknown }> = new Map(),
) => {
  for (const [key, node] of Object.entries(group)) {
    if (key.startsWith("$") || typeof node !== "object" || node === null) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if ("$value" in node && "$type" in node) out.set(path, node);
    else sourceTokens(node as TokenGroup, path, out);
  }
  return out;
};
const tokenTypes = (...groups: readonly TokenGroup[]) =>
  Object.fromEntries(
    groups.flatMap((group) =>
      [...sourceTokens(group)].map(([path, token]) => [path, String(token.$type)]),
    ),
  );

// WCAG 2.x relative luminance / contrast ratio.
const luminance = (hex: string) => {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
};

const modes = ["light", "dark"] as const;

describe("buildTheme", () => {
  it.each(modes)("resolves every token to a concrete value in %s mode", (mode) => {
    const values = Object.entries(leaves(buildTheme(mode)));

    expect(values.length).toBeGreaterThan(0);
    for (const [path, value] of values) {
      expect([path, typeof value === "string" && value.includes("{")]).toEqual([path, false]);
      expect([path, value]).not.toEqual([path, undefined]);
    }
  });

  it("exposes identical keys in light and dark", () => {
    expect(Object.keys(leaves(buildTheme("dark"))).toSorted()).toEqual(
      Object.keys(leaves(buildTheme("light"))).toSorted(),
    );
  });

  it.each([
    ["light", semanticLight],
    ["dark", semanticDark],
  ] as const)("matches each %s value kind to its DTCG $type", (mode, semanticMode) => {
    const types = tokenTypes(semantic, semanticMode, component);
    const numeric = new Set(["dimension", "duration", "number"]);

    for (const [path, value] of Object.entries(leaves(buildTheme(mode)))) {
      if (path === "mode") continue;
      const type = types[path];
      expect([path, typeof value]).toEqual([path, numeric.has(type ?? "") ? "number" : "string"]);
    }
  });

  it("resolves component tokens per mode", () => {
    expect(buildTheme("light").itemCard.amountInboundColor).toBe(
      buildTheme("light").color.text.positive,
    );
    expect(buildTheme("dark").itemCard.amountInboundColor).toBe(
      buildTheme("dark").color.text.positive,
    );
    expect(buildTheme("light").itemCard.paddingHorizontal).toBe(16);
  });

  it("makes component tokens alias semantic tokens only, never primitives", () => {
    const semanticPaths = new Map([...sourceTokens(semantic), ...sourceTokens(semanticLight)]);
    const primitivePaths = sourceTokens(primitive);

    for (const [path, { $value }] of sourceTokens(component)) {
      const reference = String($value).slice(1, -1);
      expect([path, semanticPaths.has(reference)]).toEqual([path, true]);
      expect([path, primitivePaths.has(reference)]).toEqual([path, false]);
    }
  });

  it("returns a deeply frozen theme", () => {
    const theme = buildTheme("light");

    expect(Object.isFrozen(theme)).toBe(true);
    expect(Object.isFrozen(theme.color.text)).toBe(true);
  });

  it.each(modes)("meets WCAG AA text contrast on surfaces in %s mode", (mode) => {
    const { color, badge } = buildTheme(mode);
    const pairs: readonly (readonly [string, string, string])[] = [
      ["text.primary", color.text.primary, color.surface.default],
      ["text.secondary", color.text.secondary, color.surface.default],
      ["text.secondary on background", color.text.secondary, color.background.default],
      ["text.positive", color.text.positive, color.surface.default],
      ["text.attention", color.text.attention, color.surface.default],
      ["text.critical", color.text.critical, color.surface.default],
      ["avatar initials", color.text.secondary, color.surface.muted],
      ["pending badge", badge.pendingText, badge.pendingBackground],
      ["attention badge", badge.attentionText, badge.attentionBackground],
    ];

    for (const [name, foreground, background] of pairs) {
      expect([name, contrast(foreground, background) >= 4.5]).toEqual([name, true]);
    }
  });

  it.each(modes)("meets WCAG 1.4.11 non-text contrast (3:1) for indicators in %s mode", (mode) => {
    const { color, itemCard } = buildTheme(mode);
    const pairs: readonly (readonly [string, string, string])[] = [
      ["flagged accent on card", itemCard.flaggedAccentColor, itemCard.background],
      ["flagged accent on screen", itemCard.flaggedAccentColor, color.background.default],
      ["flag icon on card", itemCard.flagIconColor, itemCard.background],
    ];

    for (const [name, foreground, background] of pairs) {
      expect([name, contrast(foreground, background) >= 3]).toEqual([name, true]);
    }
  });
});
