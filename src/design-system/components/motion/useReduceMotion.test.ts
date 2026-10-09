import { AccessibilityInfo } from "react-native";

import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useReduceMotion } from "./useReduceMotion";

describe("useReduceMotion", () => {
  afterEach(() => jest.restoreAllMocks());

  it("reads the current system setting", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);

    const { result } = await renderHook(() => useReduceMotion());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it("follows changes to the system setting", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    let notify: ((enabled: boolean) => void) | undefined;
    const remove = jest.fn();
    jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation((_event, handler) => {
      notify = handler as unknown as (enabled: boolean) => void;
      return { remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>;
    });

    const { result, unmount } = await renderHook(() => useReduceMotion());
    await act(async () => notify?.(true));

    expect(result.current).toBe(true);

    await unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("keeps a change event that arrives before the initial read resolves", async () => {
    let resolveInitial: ((enabled: boolean) => void) | undefined;
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockReturnValue(new Promise((resolve) => (resolveInitial = resolve)));
    let notify: ((enabled: boolean) => void) | undefined;
    jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation((_event, handler) => {
      notify = handler as unknown as (enabled: boolean) => void;
      return { remove: jest.fn() } as unknown as ReturnType<
        typeof AccessibilityInfo.addEventListener
      >;
    });

    const { result } = await renderHook(() => useReduceMotion());
    await act(async () => notify?.(true));
    await act(async () => resolveInitial?.(false));

    expect(result.current).toBe(true);
  });

  it("does not update after unmount when the initial read resolves late", async () => {
    let resolveInitial: ((enabled: boolean) => void) | undefined;
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockReturnValue(new Promise((resolve) => (resolveInitial = resolve)));
    const consoleError = jest.spyOn(console, "error");

    const { result, unmount } = await renderHook(() => useReduceMotion());
    await unmount();
    await act(async () => resolveInitial?.(true));

    expect(result.current).toBe(false);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
