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
  },
} as const;

type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

export type Dictionary = Widen<typeof en>;
