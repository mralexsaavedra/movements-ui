import { memo, useMemo } from "react";

import { Pressable, Text, View } from "react-native";

import { Badge, type BadgeProps } from "@/design-system/components/badge";
import { useTheme } from "@/design-system/theme";

import { style } from "./ItemCard.style";
import { ItemCardAvatar, type ItemCardLeading } from "./ItemCardAvatar";

export type ItemCardAmountTone = "positive" | "neutral" | "muted";

export interface ItemCardAmount {
  /** Already formatted, sign included (`+1.250,00 €`). Never truncated. */
  readonly text: string;
  readonly tone: ItemCardAmountTone;
}

export interface ItemCardProps {
  /** One line, ellipsized. */
  readonly title: string;
  /** One line, ellipsized. */
  readonly subtitle: string;
  readonly amount: ItemCardAmount;
  readonly leading: ItemCardLeading;
  readonly badges?: readonly BadgeProps[];
  /** Flags the item: accent border, glyph and this text (never color alone). */
  readonly attention?: { readonly label: string };
  /** Read for the whole card, which is one accessibility element; include everything visible. */
  readonly accessibilityLabel: string;
  /** Makes the card a button. Without it the card is a non-interactive summary. */
  readonly onPress?: () => void;
}

/** Decorative flag glyph next to the attention text; the text carries the meaning. */
const ATTENTION_GLYPH = "⚑";

/**
 * Generic list row: leading image or initials, title and subtitle, amount and status badges.
 * Domain-free: features map their entities to these props (see `MovementCard`).
 */
export const ItemCard = memo(function ItemCard({
  title,
  subtitle,
  amount,
  leading,
  badges,
  attention,
  accessibilityLabel,
  onPress,
}: ItemCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => style(theme), [theme]);
  const maxFontSizeMultiplier = theme.typography.maxFontSizeMultiplier;

  const content = (
    <>
      <ItemCardAvatar
        imageUrl={leading.imageUrl ?? null}
        fallbackLabel={leading.fallbackLabel}
        styles={styles}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
      />
      <View style={styles.content}>
        <Text
          style={styles.title}
          numberOfLines={1}
          ellipsizeMode="tail"
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          {title}
        </Text>
        <Text
          style={styles.subtitle}
          numberOfLines={1}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          {subtitle}
        </Text>
        {attention ? (
          <View style={styles.attention}>
            <Text style={styles.attentionIcon} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              {ATTENTION_GLYPH}
            </Text>
            <Text
              style={styles.attentionLabel}
              numberOfLines={1}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              {attention.label}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.trailing}>
        <Text
          style={[styles.amount, styles[`${amount.tone}Amount`]]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          {amount.text}
        </Text>
        {badges?.map((badge) => (
          <Badge key={`${badge.tone}:${badge.label}`} label={badge.label} tone={badge.tone} />
        ))}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessible
        role="button"
        aria-label={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [
          styles.container,
          attention && styles.flagged,
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessible
      role="summary"
      aria-label={accessibilityLabel}
      style={[styles.container, attention && styles.flagged]}
    >
      {content}
    </View>
  );
});
