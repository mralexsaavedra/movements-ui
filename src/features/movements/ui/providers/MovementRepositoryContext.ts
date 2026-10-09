import { createContext } from "react";

import type { MovementRepository } from "../../domain/MovementRepository";

/** `null` outside a provider, so the hook can fail loudly instead of using a hidden default. */
export const MovementRepositoryContext = createContext<MovementRepository | null>(null);
