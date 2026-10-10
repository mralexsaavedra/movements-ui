/**
 * English UI copy. This dictionary is the type source: every other language must provide exactly
 * the same keys (`Dictionary`), checked at compile time.
 */
export const en = {
  app: {
    title: "Movements",
  },
  movements: {
    direction: {
      inbound: "Incoming",
      outbound: "Outgoing",
    },
    badge: {
      pending: "Pending",
    },
    attention: "Needs attention",
    accessibility: {
      pending: "pending",
      attention: "needs attention",
    },
    /** Spoken before the amount in accessibility labels ("plus 12.50 euros"). */
    amountSign: {
      plus: "plus",
      minus: "minus",
    },
    list: {
      loading: "Loading movements",
      loadingMore: "Loading more movements",
      empty: "No movements yet",
      endOfList: "You're all caught up",
      loadError: "Couldn't load your movements",
      loadErrorHint: "Check your connection and try again.",
      updateError: "Couldn't update your movements",
      retry: "Try again",
      offline: "You're offline. Movements may be out of date.",
      /** Picked with `Intl.PluralRules` for the UI locale; `{count}` is the formatted number. */
      invalidNotice: {
        one: "{count} movement couldn't be shown",
        other: "{count} movements couldn't be shown",
      },
    },
  },
} as const;

type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

export type Dictionary = Widen<typeof en>;
