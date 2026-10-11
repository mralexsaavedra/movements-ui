import type { AsyncStorage } from "@tanstack/react-query-persist-client";

import { isRestorableMovementsQuery } from "@/features/movements/ui/cache/isRestorableMovementsQuery";
import { isMovementsQueryKey } from "@/features/movements/ui/cache/movementsKeys";
import { MOVEMENTS_CACHE_VERSION } from "@/features/movements/ui/cache/movementsPageSnapshot";
import {
  type QueryPersistOptions,
  createQueryPersistOptions,
} from "@/shared/query/createQueryPersistOptions";
import type { EncryptionKeyProvider } from "@/shared/storage/EncryptionKeyProvider";
import type { RandomBytes } from "@/shared/storage/RandomBytes";
import { createAesGcmCipher } from "@/shared/storage/createAesGcmCipher";
import {
  type EncryptedStorageFailure,
  createEncryptedStorage,
} from "@/shared/storage/createEncryptedStorage";

export interface AppQueryPersistDependencies {
  /** Raw string storage (AsyncStorage in the app); it only ever receives ciphertext. */
  readonly storage: AsyncStorage<string>;
  readonly keyProvider: EncryptionKeyProvider;
  readonly randomBytes: RandomBytes;
  readonly onError?: (error: unknown, failure: EncryptedStorageFailure) => void;
}

/**
 * Persists the movements list across launches so the screen paints instantly from disk while
 * fresh data loads. The snapshot is encrypted at rest with AES-256-GCM under a device-bound key
 * kept in the platform keychain; a cache that cannot be decrypted is dropped, and nothing is
 * persisted when the key is unavailable. Restored movements snapshots are validated and dropped
 * when invalid.
 */
export const createAppQueryPersistOptions = ({
  storage,
  keyProvider,
  randomBytes,
  onError,
}: AppQueryPersistDependencies): QueryPersistOptions =>
  createQueryPersistOptions({
    storage: createEncryptedStorage({
      storage,
      keyProvider,
      cipher: createAesGcmCipher({ randomBytes }),
      ...(onError ? { onError } : {}),
    }),
    buster: MOVEMENTS_CACHE_VERSION,
    shouldPersistQuery: (query) => isMovementsQueryKey(query.queryKey),
    isRestorableQuery: isRestorableMovementsQuery,
  });
