import type { ComponentType } from "react";

import { composeStories, setProjectAnnotations } from "@storybook/react";
import { render, screen } from "@testing-library/react-native";
import { readdirSync } from "node:fs";
import path from "node:path";

import * as movementCardStories from "@/features/movements/ui/components/movementCard/MovementCard.stories";

import * as preview from "../../.rnstorybook/preview";

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

    expect(screen.toJSON()).not.toBeNull();
  });

  it.each(cases)("renders %s in dark mode and English", async (_name, Story) => {
    await render(<Story themeMode="dark" language="en" />);

    expect(screen.toJSON()).not.toBeNull();
  });

  it("applies the language parameter through the global decorator", async () => {
    const { GallerySpanish, GalleryEnglish } = composeStories(movementCardStories);

    await render(<GallerySpanish />);
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0);

    await render(<GalleryEnglish />);
    expect(screen.getAllByText("Pending").length).toBeGreaterThan(0);
  });
});
