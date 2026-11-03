import { act } from "@testing-library/react-native";

/**
 * FlashList finishes its first layout after mount: it re-renders from a layout effect and marks
 * itself loaded in a `requestAnimationFrame` (a 0 ms timer under Jest). `render` and `findBy*`
 * resolve before that, so the updates would land outside `act`; this lets them run inside it.
 * Await it right after the list mounts.
 */
export const waitForListLayout = async (): Promise<void> => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};
