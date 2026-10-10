import { useEffect, useMemo } from "react";

import { AccessibilityInfo, ActivityIndicator, Pressable, Text, View } from "react-native";

import { FlashList, type ListRenderItem } from "@shopify/flash-list";

import { ItemCardSkeleton } from "@/design-system/components/itemCard";
import { useTheme } from "@/design-system/theme";
import type { Movement } from "@/features/movements/domain/Movement";
import { useI18n } from "@/shared/i18n";

import type { MovementListStatus } from "../../hooks/useMovementList";
import { MovementCard } from "../movementCard";
import { style } from "./MovementList.style";
import { formatCount } from "./formatCount";

/** Placeholder rows while the first page loads: enough to fill a phone screen. */
const PLACEHOLDER_ROWS = 6;

export interface MovementListProps {
  readonly status: MovementListStatus;
  readonly items: readonly Movement[];
  /** Movements dropped because they broke the contract (shown as a notice, never as rows). */
  readonly invalidCount: number;
  readonly isRefreshing: boolean;
  readonly isFetchingNextPage: boolean;
  readonly hasNextPage: boolean;
  readonly isOffline: boolean;
  /**
   * Last failure, `null` once a fetch succeeds: a full-page error without rows, a retry banner
   * otherwise. Each failure is a new object, so a repeated identical failure is announced again.
   */
  readonly error: Error | null;
  readonly onLoadMore: () => void;
  readonly onRefresh: () => void;
  readonly onRetry: () => void;
}

type Styles = ReturnType<typeof style>;

// Module scope: stable references, so FlashList never re-renders rows because of them.
const keyExtractor = (movement: Movement): string => movement.id;

const renderItem: ListRenderItem<Movement> = ({ item }) => <MovementCard movement={item} />;

function Separator() {
  const theme = useTheme();
  const styles = useMemo(() => style(theme), [theme]);
  return <View style={styles.separator} />;
}

interface RetryButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly styles: Styles;
  readonly maxFontSizeMultiplier: number;
}

function RetryButton({ label, onPress, styles, maxFontSizeMultiplier }: RetryButtonProps) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
    >
      <Text style={styles.retryLabel} maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Reads a failure message for screen readers (it has no other cue). Keyed on the failure itself,
 * not only the copy, so a second identical failure is announced again.
 */
const useFailureAnnouncement = (message: string | null, failure: Error | null) => {
  useEffect(() => {
    if (message !== null && failure !== null) AccessibilityInfo.announceForAccessibility(message);
  }, [message, failure]);
};

/**
 * Virtualized, paginated list of movements (FlashList, recycled rows). Presentational: the state
 * and actions come from `useMovementList` through `MovementsView`. Swapping the list engine for
 * FlatList only touches this file.
 */
export function MovementList({
  status,
  items,
  invalidCount,
  isRefreshing,
  isFetchingNextPage,
  hasNextPage,
  isOffline,
  error,
  onLoadMore,
  onRefresh,
  onRetry,
}: MovementListProps) {
  const theme = useTheme();
  const styles = useMemo(() => style(theme), [theme]);
  const { t, locale } = useI18n();
  const copy = t.movements.list;
  const fontScale = theme.typography.maxFontSizeMultiplier;
  const hasError = error !== null;
  // Rows (or an empty list) stay on screen when a refresh or a page fails; a banner offers retry.
  const showUpdateError = (status === "success" || status === "empty") && hasError;

  useFailureAnnouncement(
    status === "error" ? copy.loadError : showUpdateError ? copy.updateError : null,
    error,
  );

  // `onEndReached` can fire repeatedly; only ask for a page that exists and is not loading. After
  // a failure the retry button is the only way to ask again, so scrolling cannot loop on errors.
  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage && !hasError) onLoadMore();
  };

  const banners = (
    <>
      {isOffline ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText} maxFontSizeMultiplier={fontScale}>
            {copy.offline}
          </Text>
        </View>
      ) : null}
      {showUpdateError ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText} maxFontSizeMultiplier={fontScale}>
            {copy.updateError}
          </Text>
          <RetryButton
            label={copy.retry}
            onPress={onRetry}
            styles={styles}
            maxFontSizeMultiplier={fontScale}
          />
        </View>
      ) : null}
    </>
  );

  if (status === "loading") {
    return (
      <View style={styles.container}>
        {banners}
        <View style={styles.placeholder} accessible aria-label={copy.loading} aria-busy>
          {Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
            <ItemCardSkeleton key={index} />
          ))}
        </View>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.container}>
        {banners}
        <View style={styles.state}>
          <Text role="alert" style={styles.stateTitle} maxFontSizeMultiplier={fontScale}>
            {copy.loadError}
          </Text>
          <Text style={styles.stateBody} maxFontSizeMultiplier={fontScale}>
            {copy.loadErrorHint}
          </Text>
          <RetryButton
            label={copy.retry}
            onPress={onRetry}
            styles={styles}
            maxFontSizeMultiplier={fontScale}
          />
        </View>
      </View>
    );
  }

  const header =
    invalidCount > 0 ? (
      <Text style={styles.invalidNotice} maxFontSizeMultiplier={fontScale}>
        {formatCount(copy.invalidNotice, invalidCount, locale)}
      </Text>
    ) : null;

  const footer = isFetchingNextPage ? (
    <View style={styles.footer}>
      <ActivityIndicator aria-label={copy.loadingMore} color={theme.color.text.secondary} />
    </View>
  ) : !hasNextPage && items.length > 0 ? (
    <View style={styles.footer}>
      <Text style={styles.footerText} maxFontSizeMultiplier={fontScale}>
        {copy.endOfList}
      </Text>
    </View>
  ) : null;

  const empty = (
    <View style={styles.state}>
      <Text style={styles.stateTitle} maxFontSizeMultiplier={fontScale}>
        {copy.empty}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {banners}
      <FlashList
        testID="movement-list"
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshing={isRefreshing}
        onRefresh={onRefresh}
      />
    </View>
  );
}
