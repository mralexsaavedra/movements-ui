import type { ReactNode } from "react";

import type { MovementRepository } from "../../domain/MovementRepository";
import { MovementRepositoryContext } from "./MovementRepositoryContext";

interface MovementRepositoryProviderProps {
  /** Built by the composition root (or a test/story); components never create adapters. */
  readonly repository: MovementRepository;
  readonly children: ReactNode;
}

export function MovementRepositoryProvider({
  repository,
  children,
}: MovementRepositoryProviderProps) {
  return <MovementRepositoryContext value={repository}>{children}</MovementRepositoryContext>;
}
