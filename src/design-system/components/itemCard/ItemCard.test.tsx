import type { ReactNode } from "react";

import { fireEvent, render, screen, userEvent } from "@testing-library/react-native";

import { ThemeProvider } from "@/design-system/theme";

import { ItemCard, type ItemCardProps } from "./ItemCard";

function LightTheme({ children }: { readonly children: ReactNode }) {
  return <ThemeProvider mode="light">{children}</ThemeProvider>;
}

const baseProps: ItemCardProps = {
  title: "Northwind Grocers",
  subtitle: "Groceries · 7 Oct 2026",
  amount: { text: "−42,90 €", tone: "neutral" },
  leading: { imageUrl: null, fallbackLabel: "NG" },
  accessibilityLabel: "Outgoing, Northwind Grocers, minus 42,90 euros, 7 October 2026",
};

const renderCard = (overrides: Partial<ItemCardProps> = {}) =>
  render(<ItemCard {...baseProps} {...overrides} />, { wrapper: LightTheme });

describe("ItemCard", () => {
  it("renders the title, subtitle and amount", async () => {
    await renderCard();

    expect(screen.getByText("Northwind Grocers")).toBeOnTheScreen();
    expect(screen.getByText("Groceries · 7 Oct 2026")).toBeOnTheScreen();
    expect(screen.getByText("−42,90 €")).toBeOnTheScreen();
  });

  it("is a single accessible element announced with the given label", async () => {
    await renderCard();

    const card = screen.getByLabelText(baseProps.accessibilityLabel);

    expect(card).toHaveProp("accessible", true);
    expect(screen.getAllByLabelText(/.+/)).toEqual([card]);
  });

  it("is announced as a summary, not a button, when it cannot be pressed", async () => {
    await renderCard();

    expect(screen.getByRole("summary", { name: baseProps.accessibilityLabel })).toBeOnTheScreen();
    expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  });

  it("is a button that reports presses when it has an onPress handler", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await renderCard({ onPress });

    await user.press(screen.getByRole("button", { name: baseProps.accessibilityLabel }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps a long title on one line and the amount whole", async () => {
    const title = "The Very Long Named Neighbourhood Hardware And Garden Supplies Cooperative";
    await renderCard({ title, amount: { text: "−12.345,50 €", tone: "neutral" } });

    expect(screen.getByText(title)).toHaveProp("numberOfLines", 1);
    expect(screen.getByText("−12.345,50 €")).not.toHaveProp("numberOfLines");
  });

  it("shows the fallback initials when there is no image", async () => {
    await renderCard();

    expect(screen.getByText("NG")).toBeOnTheScreen();
  });

  it("shows the image instead of the initials when one is provided", async () => {
    await renderCard({ leading: { imageUrl: "https://example.test/ng.png", fallbackLabel: "NG" } });

    expect(screen.queryByText("NG")).not.toBeOnTheScreen();
  });

  it("falls back to the initials when the image fails to load", async () => {
    await renderCard({
      leading: { imageUrl: "https://example.test/broken.png", fallbackLabel: "NG" },
    });

    await fireEvent(screen.getByTestId("item-card-image"), "error", {
      nativeEvent: { error: "404" },
    });

    expect(screen.getByText("NG")).toBeOnTheScreen();
  });

  it("shows status badges as text, not color alone", async () => {
    await renderCard({ badges: [{ label: "Pending", tone: "pending" }] });

    expect(screen.getByText("Pending")).toBeOnTheScreen();
  });

  it("shows an attention line with text when the item needs attention", async () => {
    await renderCard({ attention: { label: "Needs attention" } });

    expect(screen.getByText("Needs attention")).toBeOnTheScreen();
  });

  it("has no attention line otherwise", async () => {
    await renderCard();

    expect(screen.queryByText("Needs attention")).not.toBeOnTheScreen();
  });
});
