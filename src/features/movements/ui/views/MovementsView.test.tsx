import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ThemeProvider } from "@/design-system/theme";
import { DEFAULT_SEED } from "@/features/movements/infrastructure/mock/createMockMovementsHttpClient";
import { generateItemDtos } from "@/features/movements/infrastructure/mock/generateItemDtos";
import { I18nProvider, createI18n } from "@/shared/i18n";

import { createControllableHttpClient } from "../../testing/createControllableHttpClient";
import { createMovementsWrapper } from "../../testing/createMovementsWrapper";
import { MovementsView } from "./MovementsView";

const TOTAL = 45;
const [firstDto] = generateItemDtos({ seed: DEFAULT_SEED, total: TOTAL });
/** Merchants repeat across the seeded dataset, so the first row's name may appear more than once. */
const findFirstRow = async () => (await screen.findAllByText(firstDto!.label.name))[0];

/** The real repository (validation + mapping) over the seeded mock transport, in English. */
const setup = async ({ failing = false } = {}) => {
  const transport = createControllableHttpClient({ total: TOTAL });
  transport.setFailing(failing);
  const { Wrapper } = createMovementsWrapper({ httpClient: transport.httpClient });

  await render(
    <ThemeProvider mode="light">
      <I18nProvider value={createI18n("en", "en-GB", "UTC")}>
        <MovementsView />
      </I18nProvider>
    </ThemeProvider>,
    { wrapper: Wrapper },
  );
  return transport;
};

const scrollToEnd = async () => {
  await fireEvent.scroll(screen.getByTestId("movement-list"), {
    nativeEvent: {
      contentOffset: { x: 0, y: 10_000 },
      contentSize: { width: 400, height: 10_900 },
      layoutMeasurement: { width: 400, height: 900 },
    },
  });
};

describe("MovementsView", () => {
  it("shows the loading placeholder, then the first page", async () => {
    await setup();

    expect(screen.getByLabelText("Loading movements")).toBeOnTheScreen();
    expect(await findFirstRow()).toBeOnTheScreen();
  });

  it("loads the next page when the user scrolls to the end", async () => {
    const transport = await setup();
    await findFirstRow();
    expect(transport.requestCount()).toBe(1);

    await scrollToEnd();

    // Mocked layouts do not grow with new rows, so the list may keep reporting its end and fetch
    // the remaining pages too; what matters is that scrolling asked for more.
    await waitFor(() => expect(transport.requestCount()).toBeGreaterThanOrEqual(2));
  });

  it("refetches the first page when the user pulls to refresh", async () => {
    const transport = await setup();
    await findFirstRow();
    expect(transport.requestCount()).toBe(1);

    await fireEvent(screen.getByTestId("movement-list"), "refresh");

    await waitFor(() => expect(transport.requestCount()).toBe(2));
  });

  it("recovers from a failed first load with the retry button", async () => {
    const transport = await setup({ failing: true });
    const retry = await screen.findByRole("button", { name: "Try again" });

    transport.setFailing(false);
    await fireEvent.press(retry);

    expect(await findFirstRow()).toBeOnTheScreen();
  });
});
