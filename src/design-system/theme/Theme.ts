import type { TextStyle } from "react-native";

import type { darkTokens } from "../tokens/generated/dark";
import type { lightTokens } from "../tokens/generated/light";

/*
 * The theme type is derived from the Style Dictionary output (`pnpm tokens`), not written by hand.
 * The generated modules are `as const`, so each value has a literal type (`16`, not `number`).
 * `Widen` relaxes literals to their primitive type so both modes share one `Theme` type, and
 * keeps `fontWeight` as React Native's own union (a plain `string` would be rejected by styles).
 */

export type ThemeMode = "light" | "dark";

type FontWeight = NonNullable<TextStyle["fontWeight"]>;

type Widen<T> = {
  readonly [K in keyof T]: K extends "fontWeight"
    ? FontWeight
    : T[K] extends string
      ? string
      : T[K] extends number
        ? number
        : Widen<T[K]>;
};

type ThemeTokens = Widen<typeof lightTokens>;

export type Theme = { readonly mode: ThemeMode } & ThemeTokens;

export type TextVariant = Theme["typography"]["title"];

// ---- Compile-time contract: both modes expose exactly the same token paths ----

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

/** Fails to compile when the light and dark generated modules drift apart. */
export type ModesMatch = Assert<Equals<Widen<typeof darkTokens>, ThemeTokens>>;
