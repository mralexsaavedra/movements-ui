import { use } from "react";

import type { MovementRepository } from "../../domain/MovementRepository";
import { MovementRepositoryContext } from "../providers/MovementRepositoryContext";

export const useMovementRepository = (): MovementRepository => {
  const repository = use(MovementRepositoryContext);
  if (!repository) {
    throw new Error("useMovementRepository must be used inside a MovementRepositoryProvider");
  }
  return repository;
};
