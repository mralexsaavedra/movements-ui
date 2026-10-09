import { useState } from "react";

import { Text, View } from "react-native";

import { Image } from "expo-image";

import type { ItemCardStyles } from "./ItemCard.style";

export interface ItemCardLeading {
  readonly imageUrl?: string | null;
  /** Shown when there is no image or it fails to load (usually up to two initials). */
  readonly fallbackLabel: string;
}

interface ItemCardAvatarProps extends ItemCardLeading {
  readonly styles: ItemCardStyles;
  readonly maxFontSizeMultiplier: number;
}

/** Decorative: the card's accessibility label already names the counterparty. */
export function ItemCardAvatar({
  imageUrl,
  fallbackLabel,
  styles,
  maxFontSizeMultiplier,
}: ItemCardAvatarProps) {
  // Keyed by URL, so a recycled row showing another image retries instead of staying on initials.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(imageUrl) && imageUrl !== failedUrl;

  return (
    <View style={styles.avatar}>
      {showImage && imageUrl ? (
        <Image
          testID="item-card-image"
          source={{ uri: imageUrl }}
          style={styles.avatarImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          // Clears the previous row's image at once when a virtualized list recycles this view.
          recyclingKey={imageUrl}
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <Text style={styles.avatarInitials} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          {fallbackLabel}
        </Text>
      )}
    </View>
  );
}
