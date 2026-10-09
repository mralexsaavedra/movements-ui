import type { ReactNode } from "react";

import { Animated } from "react-native";

import { render, screen } from "@testing-library/react-native";

import { useReduceMotion } from "@/design-system/components/motion/useReduceMotion";
import { ThemeProvider, buildTheme } from "@/design-system/theme";

import { ItemCardSkeleton } from "./ItemCardSkeleton";

jest.mock("@/design-system/components/motion/useReduceMotion", () => ({
  useReduceMotion: jest.fn(() => false),
}));

const mockedUseReduceMotion = jest.mocked(useReduceMotion);

function LightTheme({ children }: { readonly children: ReactNode }) {
  return <ThemeProvider mode="light">{children}</ThemeProvider>;
}

describe("ItemCardSkeleton", () => {
  afterEach(() => jest.restoreAllMocks());

  it("is hidden from assistive technologies (the list announces loading once)", async () => {
    await render(<ItemCardSkeleton testID="skeleton" />, { wrapper: LightTheme });

    expect(screen.queryByTestId("skeleton")).not.toBeOnTheScreen();
    expect(screen.getByTestId("skeleton", { includeHiddenElements: true })).not.toBeVisible();
  });

  it("pulses while reduce motion is off", async () => {
    mockedUseReduceMotion.mockReturnValue(false);
    const loop = jest.spyOn(Animated, "loop");

    await render(<ItemCardSkeleton />, { wrapper: LightTheme });

    expect(loop).toHaveBeenCalledTimes(1);
  });

  it("stays static at full opacity when reduce motion is on", async () => {
    mockedUseReduceMotion.mockReturnValue(true);
    const loop = jest.spyOn(Animated, "loop");

    await render(<ItemCardSkeleton testID="skeleton" />, { wrapper: LightTheme });

    expect(loop).not.toHaveBeenCalled();
    expect(screen.getByTestId("skeleton-pulse", { includeHiddenElements: true })).toHaveStyle({
      opacity: buildTheme("light").skeleton.opacityMax,
    });
  });
});
