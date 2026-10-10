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
    list: {
      loading: "Cargando movimientos",
      loadingMore: "Cargando más movimientos",
      empty: "Todavía no hay movimientos",
      endOfList: "No hay más movimientos",
      loadError: "No se han podido cargar los movimientos",
      loadErrorHint: "Comprueba la conexión e inténtalo de nuevo.",
      updateError: "No se han podido actualizar los movimientos",
      retry: "Reintentar",
      offline: "Sin conexión. Es posible que los movimientos no estén actualizados.",
      invalidNotice: {
        one: "No se ha podido mostrar {count} movimiento",
        other: "No se han podido mostrar {count} movimientos",
      },
    },
  },
};
