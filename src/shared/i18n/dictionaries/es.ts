import type { Dictionary } from "./en";

/** Spanish UI copy. Typed as `Dictionary`, so a missing or extra key fails to compile. */
export const es: Dictionary = {
  app: {
    title: "Movimientos",
  },
  movements: {
    direction: {
      inbound: "Ingreso",
      outbound: "Cargo",
    },
    badge: {
      pending: "Pendiente",
    },
    attention: "Requiere atención",
    accessibility: {
      pending: "pendiente",
      attention: "requiere atención",
    },
    amountSign: {
      plus: "más",
      minus: "menos",
    },
  },
};
