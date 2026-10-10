import type { ReactNode } from "react";

import { AccessibilityInfo } from "react-native";

import { fireEvent, render, screen } from "@testing-library/react-native";

import { ThemeProvider } from "@/design-system/theme";
import { itemDtos } from "@/features/movements/infrastructure/__fixtures__/itemDtos";
import { toMovement } from "@/features/movements/infrastructure/mappers/toMovement";
import { generateItemDtos } from "@/features/movements/infrastructure/mock/generateItemDtos";
import { I18nProvider, type Language, createI18n } from "@/shared/i18n";

import { MovementList, type MovementListProps } from "./MovementList";

const movements = itemDtos.map(toMovement);
/** Taller than the mocked 900-point viewport (100-point rows), so the end is reached by scrolling. */
const pageOfMovements = generateItemDtos({ seed: 7, total: 20 }).map(toMovement);

const providers =
  (language: Language = "en", locale = "en-GB") =>
  ({ children }: { readonly children: ReactNode }) => (
    <ThemeProvider mode="light">
      <I18nProvider value={createI18n(language, locale, "UTC")}>{children}</I18nProvider>
    </ThemeProvider>
  );

const baseProps: MovementListProps = {
  status: "success",
  items: movements,
  invalidCount: 0,
  isRefreshing: false,
  isFetchingNextPage: false,
  hasNextPage: true,
  isOffline: false,
  hasError: false,
  onLoadMore: () => undefined,
  onRefresh: () => undefined,
  onRetry: () => undefined,
};

const renderList = async (
  props: Partial<MovementListProps> = {},
  { language, locale }: { language?: Language; locale?: string } = {},
) => {
  const handlers = {
    onLoadMore: jest.fn(),
    onRefresh: jest.fn(),
    onRetry: jest.fn(),
  };
  await render(<MovementList {...baseProps} {...handlers} {...props} />, {
    wrapper: providers(language, locale),
  });
  return handlers;
};

/** Scrolls the list to its end, which is what makes FlashList report "end reached". */
const scrollToEnd = async () => {
  await fireEvent.scroll(screen.getByTestId("movement-list"), {
    nativeEvent: {
      contentOffset: { x: 0, y: 10_000 },
      contentSize: { width: 400, height: 10_900 },
      layoutMeasurement: { width: 400, height: 900 },
    },
  });
};

describe("MovementList", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the movements as list rows", async () => {
    await renderList();

    expect(screen.getByText("Lumen Coffee Roasters")).toBeOnTheScreen();
    expect(screen.getByText("Northwind Payroll")).toBeOnTheScreen();
  });

  it("shows an accessible loading placeholder instead of rows while loading", async () => {
    await renderList({ status: "loading", items: [] });

    expect(screen.getByLabelText("Loading movements")).toBeBusy();
    expect(screen.queryByText("Lumen Coffee Roasters")).not.toBeOnTheScreen();
  });

  it("shows the empty state when there are no movements", async () => {
    await renderList({ status: "empty", items: [], hasNextPage: false });

    expect(screen.getByText("No movements yet")).toBeOnTheScreen();
  });

  it("shows a full-page error whose retry button calls onRetry", async () => {
    const { onRetry } = await renderList({ status: "error", items: [], hasError: true });

    expect(screen.getByText("Couldn't load your movements")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("announces a load error to assistive technologies", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");

    await renderList({ status: "error", items: [], hasError: true });

    expect(announce).toHaveBeenCalledWith("Couldn't load your movements");
  });

  it("keeps the rows and offers a retry when a later fetch fails", async () => {
    const { onRetry } = await renderList({ hasError: true });

    expect(screen.getByText("Lumen Coffee Roasters")).toBeOnTheScreen();
    expect(screen.getByText("Couldn't update your movements")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("asks for the next page when the end of the list is reached", async () => {
    const { onLoadMore } = await renderList({ items: pageOfMovements });
    expect(onLoadMore).not.toHaveBeenCalled();

    await scrollToEnd();

    expect(onLoadMore).toHaveBeenCalled();
  });

  it.each([
    ["a page is already being fetched", { isFetchingNextPage: true }],
    ["there are no more pages", { hasNextPage: false }],
  ] as const)("does not ask for more when %s", async (_, props) => {
    const { onLoadMore } = await renderList({ items: pageOfMovements, ...props });

    await scrollToEnd();

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("shows a loading indicator in the footer while the next page loads", async () => {
    await renderList({ isFetchingNextPage: true });

    expect(screen.getByLabelText("Loading more movements")).toBeOnTheScreen();
  });

  it("tells the user when every movement is shown", async () => {
    await renderList({ hasNextPage: false });

    expect(screen.getByText("You're all caught up")).toBeOnTheScreen();
  });

  it.each([
    [1, "en", "en-GB", "1 movement couldn't be shown"],
    [3, "en", "en-GB", "3 movements couldn't be shown"],
    [1, "es", "es-ES", "No se ha podido mostrar 1 movimiento"],
    [3, "es", "es-ES", "No se han podido mostrar 3 movimientos"],
  ] as const)(
    "notices %i invalid movement(s) in %s",
    async (invalidCount, language, locale, expected) => {
      await renderList({ invalidCount }, { language, locale });

      expect(screen.getByText(expected)).toBeOnTheScreen();
    },
  );

  it("shows no invalid notice when every movement is valid", async () => {
    await renderList({ invalidCount: 0 });

    expect(screen.queryByText(/couldn't be shown/)).not.toBeOnTheScreen();
  });

  it("shows an offline banner while there is no connection", async () => {
    await renderList({ isOffline: true });

    expect(screen.getByText("You're offline. Movements may be out of date.")).toBeOnTheScreen();
  });
});
