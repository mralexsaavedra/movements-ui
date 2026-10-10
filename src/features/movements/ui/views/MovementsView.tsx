import { useMemo } from "react";

import { Text, View } from "react-native";

import { useTheme } from "@/design-system/theme";
import { useI18n } from "@/shared/i18n";

import { MovementList } from "../components/movementList";
import { useMovementList } from "../hooks/useMovementList";
import { style } from "./MovementsView.style";

/** Movements screen: wires the list controller to the presentational `MovementList`. */
export function MovementsView() {
  const theme = useTheme();
  const styles = useMemo(() => style(theme), [theme]);
  const { t } = useI18n();
  const list = useMovementList();
  const { refresh } = list;

  return (
    <View style={styles.container}>
      <Text
        role="heading"
        style={styles.title}
        maxFontSizeMultiplier={theme.typography.maxFontSizeMultiplier}
      >
        {t.app.title}
      </Text>
      <MovementList
        status={list.status}
        items={list.items}
        invalidCount={list.invalidCount}
        isRefreshing={list.isRefreshing}
        isFetchingNextPage={list.isFetchingNextPage}
        hasNextPage={list.hasNextPage}
        isOffline={list.isOffline}
        hasError={list.error !== null}
        onLoadMore={list.loadMore}
        onRefresh={() => void refresh()}
        onRetry={list.retry}
      />
    </View>
  );
}
