/** The only place movements query keys are built; never inline key arrays elsewhere. */
export const movementsKeys = {
  all: ["movements"] as const,
  lists: () => [...movementsKeys.all, "list"] as const,
  list: (params: { readonly limit: number }) => [...movementsKeys.lists(), params] as const,
} as const;

/** True for any query under `movementsKeys.all` (used to pick what gets persisted). */
export const isMovementsQueryKey = (queryKey: readonly unknown[]): boolean =>
  queryKey[0] === movementsKeys.all[0];
