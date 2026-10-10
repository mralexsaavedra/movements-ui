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

## FlashList vs FlatList (decided: FlashList v2 — rationale in README)

| Aspect           | FlatList (core)                         | FlashList (Shopify)                                               |
| ---------------- | --------------------------------------- | ----------------------------------------------------------------- |
| Dependency       | none                                    | extra package (check SDK 57 compatibility via `npx expo install`) |
| Rendering        | virtualization, mounts/unmounts rows    | cell recycling, fewer blank areas                                 |
| Tuning           | `getItemLayout`, `windowSize`, batching | mostly automatic (v2 drops `estimatedItemSize`)                   |
| New Architecture | supported                               | v2 requires New Architecture                                      |
| Risk             | well known, verbose tuning              | recycling bugs if rows hold local state                           |

Decision: FlashList `2.0.2` (the SDK 57 pin, via `npx expo install`), wrapped by
`features/movements/ui/components/movementList/MovementList.tsx`, the only file that imports it.
Measure (JS FPS, blank cells) with the 5000-row mock in a dev build before claiming numbers.

FlashList v2 API (verified against the installed `dist/FlashListProps.d.ts`):

- No `estimatedItemSize`, `estimatedListSize` or `getItemLayout`: sizes are measured.
- Same names as FlatList for `data`, `renderItem`, `keyExtractor`, `onEndReached(Threshold)`,
  `refreshing`/`onRefresh`, `ListHeader/Footer/EmptyComponent`, `ItemSeparatorComponent`.
- `maintainVisibleContentPosition` is on by default; `getItemType` for heterogeneous rows.
- Jest: `jest.setup.ts` mocks only the measurement half of `@shopify/flash-list/jestSetup`; the
  package file remaps `FlashList` to a `RecyclerView` export 2.0.2 does not have.
- Mocked layouts do not grow with new rows, so a test that scrolls to the end may see
  `onEndReached` again after a page lands; assert "asked for more", not an exact request count.

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

FlatList equivalent, kept for the swap (`MovementList` passes the same props to FlashList minus
`getItemLayout`/`initialNumToRender`/`windowSize`/`removeClippedSubviews`):

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

| State            | UI                                 |
| ---------------- | ---------------------------------- |
| Initial loading  | N skeleton rows (no spinner)       |
| Offline          | Banner above list, rows stay       |
| Empty            | Empty state message                |
| Error, no data   | Error state + retry button         |
| Error, with data | Keep data, retry banner above list |
| Loading more     | Footer spinner (labelled)          |
| Refreshing       | Native pull-to-refresh indicator   |

## Checks

- `onEndReached` can fire multiple times; the controller guard prevents duplicate fetches.
- No `ScrollView` + `map` for collections. No nested vertical virtualized lists.
- Profile in release/dev-client mode, not Expo Go dev mode, before claiming numbers.
