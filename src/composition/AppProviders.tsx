import { type ReactNode, useEffect, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { ThemeProvider } from "@/design-system/theme";
import { MovementRepositoryProvider } from "@/features/movements/ui/providers/MovementRepositoryProvider";
import { configureQueryManagers } from "@/shared/query/configureQueryManagers";
import { createQueryClient } from "@/shared/query/createQueryClient";

import { createMovementRepository } from "./dependencies";
import { createAppQueryPersistOptions } from "./queryPersistence";

/** Built once per app instance (not at import time, so importing this file has no side effects). */
const createAppDependencies = () => ({
  queryClient: createQueryClient(),
  persistOptions: createAppQueryPersistOptions(AsyncStorage),
  movementRepository: createMovementRepository(),
});

interface AppProvidersProps {
  readonly children: ReactNode;
}

/** Server-state cache (persisted across launches), injected adapters and theme. */
export function AppProviders({ children }: AppProvidersProps) {
  const [{ queryClient, persistOptions, movementRepository }] = useState(createAppDependencies);

  useEffect(() => {
    configureQueryManagers();
  }, []);

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <MovementRepositoryProvider repository={movementRepository}>
        <ThemeProvider>{children}</ThemeProvider>
      </MovementRepositoryProvider>
    </PersistQueryClientProvider>
  );
}
