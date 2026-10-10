import type { ComponentType } from "react";

import { composeStories, setProjectAnnotations } from "@storybook/react";
import { render, screen } from "@testing-library/react-native";
import { readdirSync } from "node:fs";
import path from "node:path";

import * as movementCardStories from "@/features/movements/ui/components/movementCard/MovementCard.stories";

import * as preview from "../../.rnstorybook/preview";
import { STORYBOOK_CANVAS_TEST_ID } from "./withProviders";

// Same decorators, argTypes and render as the on-device catalog.
setProjectAnnotations(preview);

type StoriesModule = Parameters<typeof composeStories>[0];
/** A composed story: renders with project and story annotations; props override its args. */
type ComposedStory = ComponentType<Readonly<Record<string, unknown>>>;

const SRC = path.resolve(__dirname, "..");

/** Every colocated story file under `src/`, so a new one is covered without editing this test. */
const storyFiles = (readdirSync(SRC, { recursive: true }) as string[])
  .filter((file) => /\.stories\.tsx?$/.test(file))
  .toSorted();

const cases = storyFiles.flatMap((file) => {
  const stories = composeStories(require(path.join(SRC, file)) as StoriesModule);
  return Object.entries(stories as Record<string, ComposedStory>).map(
    ([name, Story]) => [`${file} › ${name}`, Story] as const,
  );
});

describe("Storybook stories", () => {
  // A story that renders but logs (missing key, invalid prop, act warning) still fails.
  let consoleError: jest.SpyInstance;
  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    const calls = consoleError.mock.calls;
    consoleError.mockRestore();
    if (calls.length > 0) throw new Error(`console.error during render: ${String(calls[0])}`);
  });

  it("finds the story files", () => {
    expect(storyFiles.length).toBeGreaterThan(0);
  });

  it.each(cases)("renders %s with the catalog decorators", async (_name, Story) => {
    await render(<Story />);

    // The canvas always renders, so assert the story put something inside it.
    expect(screen.getByTestId(STORYBOOK_CANVAS_TEST_ID)).not.toBeEmptyElement();
  });

  it.each(cases)("renders %s in dark mode and English", async (_name, Story) => {
    await render(<Story themeMode="dark" language="en" />);

    expect(screen.getByTestId(STORYBOOK_CANVAS_TEST_ID)).not.toBeEmptyElement();
  });

  describe("language precedence", () => {
    // Spanish is also the decorator fallback, so prove the story parameter against an English
    // project default (merged over the global annotations set above).
    const { Pending, GallerySpanish } = composeStories(movementCardStories, {
      parameters: { language: "en" },
    });
    const GalleryWithArgs = GallerySpanish as ComposedStory;

    it("uses the project parameter when the story sets none", async () => {
      await render(<Pending />);

      expect(screen.getByText("Pending")).toBeOnTheScreen();
    });

    it("lets the story parameter override the project parameter", async () => {
      await render(<GallerySpanish />);

      expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0);
    });

    it("lets an arg override the story parameter", async () => {
      await render(<GalleryWithArgs language="en" />);

      expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
      expect(screen.queryByText("Pendiente")).not.toBeOnTheScreen();
    });
  });
});
