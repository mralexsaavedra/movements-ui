import type { ReactNode } from "react";

import { renderHook } from "@testing-library/react-native";

import type { MovementRepository } from "../../domain/MovementRepository";
import { MovementRepositoryProvider } from "../providers/MovementRepositoryProvider";
import { useMovementRepository } from "./useMovementRepository";

describe("useMovementRepository", () => {
  it("returns the repository given to the provider", async () => {
    const repository: MovementRepository = { getMovements: jest.fn() };
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <MovementRepositoryProvider repository={repository}>{children}</MovementRepositoryProvider>
    );

    const { result } = await renderHook(() => useMovementRepository(), { wrapper });

    expect(result.current).toBe(repository);
  });

  it("throws outside a provider", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      await expect(renderHook(() => useMovementRepository())).rejects.toThrow(
        /MovementRepositoryProvider/,
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
