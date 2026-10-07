import component from "../tokens/component.json";
import primitive from "../tokens/primitive.json";
import semantic from "../tokens/semantic.json";
import semanticLight from "../tokens/semantic.light.json";
import { buildTheme } from "./buildTheme";
import { flattenTokens } from "./resolveTokens";
import type { TokenGroup } from "./resolveTokens";

type Leaves = Record<string, unknown>;

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

/** `$type` of every token, from the source JSON (DTCG metadata the theme drops). */
const tokenTypes = (group: TokenGroup, prefix = "", out: Record<string, string> = {}) => {
  for (const [key, node] of Object.entries(group)) {
    if (key.startsWith("$") || typeof node !== "object") continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if ("$value" in node) out[path] = String(node.$type);
    else tokenTypes(node as TokenGroup, path, out);
  }
  return out;
};

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

  it("matches each value kind to its DTCG $type", () => {
    const types = tokenTypes(semantic);
    Object.assign(types, tokenTypes(semanticLight), tokenTypes(component));
    const numeric = new Set(["dimension", "duration", "number"]);

    for (const [path, value] of Object.entries(leaves(buildTheme("light")))) {
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
    const semanticPaths = flattenTokens(semantic, flattenTokens(semanticLight));
    const primitivePaths = flattenTokens(primitive);

    for (const [path, value] of flattenTokens(component)) {
      const reference = String(value).slice(1, -1);
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
});
