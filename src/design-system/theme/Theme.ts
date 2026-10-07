import type { TextStyle } from "react-native";

import type component from "../tokens/component.json";
import type semanticDark from "../tokens/semantic.dark.json";
import type semantic from "../tokens/semantic.json";
import type semanticLight from "../tokens/semantic.light.json";

/*
 * Why a hand-written interface instead of `typeof resolvedJson`?
 * JSON imports widen every `$value` to `string`, so an alias such as `"{spacing.md}"` would be
 * typed `string` although it resolves to a number, and RN style props would reject it.
 * The interface keeps precise value types; `ThemeMatchesTokens` below fails compilation if its
 * keys drift from the JSON, and buildTheme.test.ts checks each runtime value against its `$type`.
 */

export type ThemeMode = "light" | "dark";

type Color = string;
type Dimension = number;
type Duration = number;
type FontWeight = NonNullable<TextStyle["fontWeight"]>;

export interface TextVariant {
  readonly fontSize: Dimension;
  readonly lineHeight: Dimension;
  readonly fontWeight: FontWeight;
}

export interface Theme {
  readonly mode: ThemeMode;
  readonly color: {
    readonly background: { readonly default: Color };
    readonly surface: { readonly default: Color; readonly muted: Color; readonly attention: Color };
    readonly text: {
      readonly primary: Color;
      readonly secondary: Color;
      readonly positive: Color;
      readonly attention: Color;
      readonly critical: Color;
    };
    readonly border: { readonly default: Color; readonly attention: Color };
    readonly icon: { readonly attention: Color };
    readonly status: {
      readonly pending: { readonly background: Color; readonly text: Color };
      readonly attention: { readonly background: Color; readonly text: Color };
    };
  };
  readonly spacing: {
    readonly none: Dimension;
    readonly xxs: Dimension;
    readonly xs: Dimension;
    readonly sm: Dimension;
    readonly md: Dimension;
    readonly lg: Dimension;
    readonly xl: Dimension;
  };
  readonly radius: {
    readonly sm: Dimension;
    readonly md: Dimension;
    readonly lg: Dimension;
    readonly pill: Dimension;
  };
  readonly size: {
    readonly icon: Dimension;
    readonly avatar: Dimension;
    readonly touchTarget: Dimension;
    readonly listItemMin: Dimension;
  };
  readonly borderWidth: { readonly hairline: Dimension; readonly accent: Dimension };
  readonly typography: {
    readonly title: TextVariant;
    readonly body: TextVariant;
    readonly caption: TextVariant;
    readonly amount: TextVariant;
    readonly badge: TextVariant;
    readonly maxFontSizeMultiplier: number;
  };
  readonly motion: {
    readonly duration: {
      readonly fast: Duration;
      readonly base: Duration;
      readonly skeletonPulse: Duration;
    };
  };
  readonly opacity: { readonly skeletonMin: number; readonly skeletonMax: number };
  readonly itemCard: {
    readonly background: Color;
    readonly borderColor: Color;
    readonly borderWidth: Dimension;
    readonly radius: Dimension;
    readonly paddingHorizontal: Dimension;
    readonly paddingVertical: Dimension;
    readonly gap: Dimension;
    readonly minHeight: Dimension;
    readonly titleColor: Color;
    readonly subtitleColor: Color;
    readonly amountInboundColor: Color;
    readonly amountOutboundColor: Color;
    readonly amountPendingColor: Color;
    readonly flaggedAccentColor: Color;
    readonly flaggedAccentWidth: Dimension;
    readonly flagIconColor: Color;
    readonly flagIconSize: Dimension;
    readonly flagTextColor: Color;
    readonly avatarSize: Dimension;
    readonly avatarRadius: Dimension;
    readonly avatarBackground: Color;
    readonly avatarTextColor: Color;
  };
  readonly badge: {
    readonly paddingHorizontal: Dimension;
    readonly paddingVertical: Dimension;
    readonly radius: Dimension;
    readonly pendingBackground: Color;
    readonly pendingText: Color;
    readonly attentionBackground: Color;
    readonly attentionText: Color;
  };
  readonly skeleton: {
    readonly color: Color;
    readonly radius: Dimension;
    readonly pulseDuration: Duration;
    readonly opacityMin: number;
    readonly opacityMax: number;
  };
}

// ---- Compile-time contract between the JSON token files and `Theme` ----

type ChildKeys<T> = Exclude<keyof T & string, `$${string}`>;

/** Dot paths of every DTCG token (object with `$value`) in a JSON tree. */
type TokenPaths<T, P extends string = ""> = {
  [K in ChildKeys<T>]: T[K] extends { readonly $value: unknown }
    ? `${P}${K}`
    : TokenPaths<T[K], `${P}${K}.`>;
}[ChildKeys<T>];

/** Dot paths of every leaf value in the resolved theme. */
type ValuePaths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string | number
    ? `${P}${K}`
    : ValuePaths<T[K], `${P}${K}.`>;
}[keyof T & string];

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

type TokenSources = typeof semantic & typeof semanticLight & typeof component;

/** Fails to compile when a token is added/removed in JSON without updating `Theme`. */
export type ThemeMatchesTokens = Assert<
  Equals<TokenPaths<TokenSources>, ValuePaths<Omit<Theme, "mode">>>
>;

/** Fails to compile when the light and dark color files expose different keys. */
export type ColorModesMatch = Assert<
  Equals<TokenPaths<typeof semanticLight>, TokenPaths<typeof semanticDark>>
>;
