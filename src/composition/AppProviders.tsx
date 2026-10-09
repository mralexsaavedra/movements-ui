import { type ReactNode, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { ThemeProvider } from "@/design-system/theme";
import { MovementRepositoryProvider } from "@/features/movements/ui/providers/MovementRepositoryProvider";
import { I18nProvider } from "@/shared/i18n";
import { configureQueryManagers } from "@/shared/query/configureQueryManagers";
import { createQueryClient } from "@/shared/query/createQueryClient";

import { createMovementRepository } from "./dependencies";
import { createAppQueryPersistOptions } from "./queryPersistence";

/**
 * Built once per app instance, during the first render of `AppProviders` (not at import time, so
 * importing this file has no side effects). Focus/online listeners are connected here, before any
 * child mounts and subscribes to a query; the call is idempotent.
 */
const createAppDependencies = () => {
  configureQueryManagers();
  return {
    queryClient: createQueryClient(),
    persistOptions: createAppQueryPersistOptions(AsyncStorage),
    movementRepository: createMovementRepository(),
  };
};

interface AppProvidersProps {
  readonly children: ReactNode;
}

/** Server-state cache (persisted across launches), injected adapters, theme and UI language. */
export function AppProviders({ children }: AppProvidersProps) {
  const [{ queryClient, persistOptions, movementRepository }] = useState(createAppDependencies);

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <MovementRepositoryProvider repository={movementRepository}>
        <ThemeProvider>
          <I18nProvider>{children}</I18nProvider>
        </ThemeProvider>
      </MovementRepositoryProvider>
    </PersistQueryClientProvider>
  );
}
