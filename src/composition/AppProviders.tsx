import { type ReactNode, useState } from "react";

import { Platform } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { ThemeProvider } from "@/design-system/theme";
import { MovementRepositoryProvider } from "@/features/movements/ui/providers/MovementRepositoryProvider";
import { I18nProvider } from "@/shared/i18n";
import { configureQueryManagers } from "@/shared/query/configureQueryManagers";
import { createQueryClient } from "@/shared/query/createQueryClient";

import {
  createSecureStoreKeyProvider,
  expoRandomBytes,
  reportCacheEncryptionFailure,
} from "./cacheEncryption";
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
    // The web has no secure key store for the cache key, so the cache stays in memory there
    // instead of failing (and warning) on every write.
    persistOptions:
      Platform.OS === "web"
        ? null
        : createAppQueryPersistOptions({
            storage: AsyncStorage,
            keyProvider: createSecureStoreKeyProvider(),
            randomBytes: expoRandomBytes,
            onError: reportCacheEncryptionFailure,
          }),
    movementRepository: createMovementRepository(),
  };
};

interface AppProvidersProps {
  readonly children: ReactNode;
}

/** Server-state cache (persisted across launches on native), injected adapters, theme and UI language. */
export function AppProviders({ children }: AppProvidersProps) {
  const [{ queryClient, persistOptions, movementRepository }] = useState(createAppDependencies);

  const app = (
    <MovementRepositoryProvider repository={movementRepository}>
      <ThemeProvider>
        <I18nProvider>{children}</I18nProvider>
      </ThemeProvider>
    </MovementRepositoryProvider>
  );

  return persistOptions ? (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      {app}
    </PersistQueryClientProvider>
  ) : (
    <QueryClientProvider client={queryClient}>{app}</QueryClientProvider>
  );
}
