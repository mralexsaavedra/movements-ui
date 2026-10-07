---
name: rn-list-performance
description: "Trigger: list, FlatList, FlashList, virtualization, infinite scroll, pagination, onEndReached, thousands of rows, scroll performance, pull to refresh, skeleton. List performance rules for movements-ui."
license: MIT
metadata:
  author: alexander-saavedra
  version: "1.0"
---

## Activation Contract

Load before building or optimizing `MovementList` or any long scrollable collection.

## FlashList vs FlatList (open decision — record outcome in README)

| Aspect           | FlatList (core)                         | FlashList (Shopify)                                               |
| ---------------- | --------------------------------------- | ----------------------------------------------------------------- |
| Dependency       | none                                    | extra package (check SDK 57 compatibility via `npx expo install`) |
| Rendering        | virtualization, mounts/unmounts rows    | cell recycling, fewer blank areas                                 |
| Tuning           | `getItemLayout`, `windowSize`, batching | mostly automatic (v2 drops `estimatedItemSize`)                   |
| New Architecture | supported                               | v2 requires New Architecture                                      |
| Risk             | well known, verbose tuning              | recycling bugs if rows hold local state                           |

Pick one, measure (JS FPS, blank cells) with ~5000 mock rows, document why.

## Row Rules

- Row component wrapped in `memo`; props are primitives or stable references.
- `keyExtractor` and `renderItem` defined outside render or via `useCallback`.
- Rows hold no local state (critical under recycling).
- Fixed row height when possible → enables `getItemLayout` (FlatList) and cheap layout.
- Images: fixed size, cached (`expo-image`), fallback for `null`.

```tsx
const keyExtractor = (m: Movement) => m.id;

const MovementRow = memo(({ movement }: { readonly movement: Movement }) => (
  <ItemCard movement={movement} />
));

const renderItem: ListRenderItem<Movement> = ({ item }) => <MovementRow movement={item} />;

const getItemLayout = (_: ArrayLike<Movement> | null | undefined, index: number) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});
```

`ITEM_HEIGHT` derives from tokens (`theme.itemCard.height + theme.list.gap`), not a literal.

## Pagination & States

```tsx
<FlatList
  data={movements}
  keyExtractor={keyExtractor}
  renderItem={renderItem}
  getItemLayout={getItemLayout}
  onEndReached={loadMore} // guarded: hasNextPage && !isFetchingNextPage
  onEndReachedThreshold={0.5} // half a viewport before the end
  refreshing={isRefreshing}
  onRefresh={refresh}
  ListFooterComponent={isLoadingMore ? <ItemCardSkeleton /> : null}
  ListEmptyComponent={<EmptyState />}
  initialNumToRender={12}
  windowSize={7}
  removeClippedSubviews
/>
```

| State            | UI                                |
| ---------------- | --------------------------------- |
| Initial loading  | N skeleton rows (no spinner)      |
| Empty            | Empty state message               |
| Error, no data   | Error state + retry button        |
| Error, with data | Keep data, inline retry in footer |
| Loading more     | Footer skeleton                   |
| Refreshing       | Native pull-to-refresh indicator  |

## Checks

- `onEndReached` can fire multiple times; the controller guard prevents duplicate fetches.
- No `ScrollView` + `map` for collections. No nested vertical virtualized lists.
- Profile in release/dev-client mode, not Expo Go dev mode, before claiming numbers.
