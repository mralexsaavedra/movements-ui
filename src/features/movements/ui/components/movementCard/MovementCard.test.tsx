import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react-native";

import { ThemeProvider } from "@/design-system/theme";
import type { Movement } from "@/features/movements/domain/Movement";
import { I18nProvider, createI18n } from "@/shared/i18n";

import { MovementCard } from "./MovementCard";

const movement: Movement = {
  id: "mv-7",
  direction: "outbound",
  status: "pending",
  amount: { value: 42.9, currency: "EUR" },
  counterparty: { name: "Northwind Grocers", imageUrl: null },
  category: "Groceries",
  date: new Date("2026-10-07T12:00:00Z"),
  flagged: true,
};

const providers =
  (language: "es" | "en", locale: string) =>
  ({ children }: { readonly children: ReactNode }) => (
    <ThemeProvider mode="light">
      <I18nProvider value={createI18n(language, locale)}>{children}</I18nProvider>
    </ThemeProvider>
  );

/** Exact match where any space may be one of the non-breaking spaces ICU emits. */
const icuText = (text: string) =>
  new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[ \u00A0\u202F]")}$`);

describe("MovementCard", () => {
  it("renders a pending, flagged outbound movement in Spanish", async () => {
    await render(<MovementCard movement={movement} timeZone="UTC" />, {
      wrapper: providers("es", "es-ES"),
    });

    expect(screen.getByText("Northwind Grocers")).toBeOnTheScreen();
    expect(screen.getByText("Pendiente")).toBeOnTheScreen();
    expect(screen.getByText("Requiere atención")).toBeOnTheScreen();
    expect(screen.getByText("NG")).toBeOnTheScreen();
    expect(
      screen.getByRole("summary", {
        name: icuText(
          "Cargo, Northwind Grocers, menos 42,90 euros, pendiente, requiere atención, 7 de octubre de 2026",
        ),
      }),
    ).toBeOnTheScreen();
  });

  it("renders the same movement in English", async () => {
    await render(<MovementCard movement={movement} timeZone="UTC" />, {
      wrapper: providers("en", "en-GB"),
    });

    expect(screen.getByText("Pending")).toBeOnTheScreen();
    expect(screen.getByText("Needs attention")).toBeOnTheScreen();
    expect(screen.getByText(icuText("−€42.90"))).toBeOnTheScreen();
    expect(
      screen.getByRole("summary", {
        name: icuText(
          "Outgoing, Northwind Grocers, minus 42.90 euros, pending, needs attention, 7 October 2026",
        ),
      }),
    ).toBeOnTheScreen();
  });

  it("is a button when it has an action", async () => {
    await render(<MovementCard movement={movement} onPress={jest.fn()} />, {
      wrapper: providers("en", "en-GB"),
    });

    expect(screen.getByRole("button")).toBeOnTheScreen();
  });
});
