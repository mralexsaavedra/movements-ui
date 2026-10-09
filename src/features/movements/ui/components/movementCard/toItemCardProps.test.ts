import type { Movement } from "@/features/movements/domain/Movement";
import { createI18n } from "@/shared/i18n";
import { normalizeSpaces } from "@/shared/testing/normalizeSpaces";

import { toItemCardProps } from "./toItemCardProps";

const english = createI18n("en", "en-GB", "UTC");
const spanish = createI18n("es", "es-ES", "UTC");

const buildMovement = (overrides: Partial<Movement> = {}): Movement => ({
  id: "mv-1",
  direction: "inbound",
  status: "confirmed",
  amount: { value: 1250, currency: "EUR" },
  counterparty: { name: "Acme Payroll", imageUrl: null },
  category: "Salary",
  date: new Date("2026-10-03T12:00:00Z"),
  flagged: false,
  ...overrides,
});

const map = (movement: Movement, i18n = english) => {
  const props = toItemCardProps(movement, i18n);
  return {
    ...props,
    amount: { ...props.amount, text: normalizeSpaces(props.amount.text) },
    accessibilityLabel: normalizeSpaces(props.accessibilityLabel),
  };
};

describe("toItemCardProps", () => {
  it("shows the counterparty as the title and category · date as the subtitle", () => {
    expect(map(buildMovement())).toMatchObject({
      title: "Acme Payroll",
      subtitle: "Salary · 3 Oct 2026",
    });
    expect(map(buildMovement(), spanish).subtitle).toBe("Salary · 3 oct 2026");
  });

  it("signs inbound amounts with + in the positive tone", () => {
    expect(map(buildMovement({ direction: "inbound" })).amount).toEqual({
      text: "+€1,250.00",
      tone: "positive",
    });
  });

  it("signs outbound amounts with a true minus in the neutral tone", () => {
    const { amount } = map(buildMovement({ direction: "outbound" }), spanish);

    expect(amount).toEqual({ text: "−1250,00 €", tone: "neutral" });
  });

  it.each(["inbound", "outbound"] as const)(
    "mutes a pending %s amount and adds a pending badge",
    (direction) => {
      const props = map(buildMovement({ direction, status: "pending" }));

      expect(props.amount.tone).toBe("muted");
      expect(props.badges).toEqual([{ label: "Pending", tone: "pending" }]);
    },
  );

  it("adds no badge or attention to a confirmed, unflagged movement", () => {
    const props = map(buildMovement());

    expect(props).not.toHaveProperty("badges");
    expect(props).not.toHaveProperty("attention");
  });

  it("flags a movement that needs attention, in the UI language", () => {
    expect(map(buildMovement({ flagged: true })).attention).toEqual({ label: "Needs attention" });
    expect(map(buildMovement({ flagged: true }), spanish).attention).toEqual({
      label: "Requiere atención",
    });
  });

  it("uses initials as the fallback and passes the image through", () => {
    expect(map(buildMovement()).leading).toEqual({ imageUrl: null, fallbackLabel: "AP" });
    expect(
      map(buildMovement({ counterparty: { name: "acme", imageUrl: "https://example.test/a.png" } }))
        .leading,
    ).toEqual({ imageUrl: "https://example.test/a.png", fallbackLabel: "A" });
  });

  it("announces every fact in the documented order, in English", () => {
    const movement = buildMovement({ status: "pending", flagged: true });

    expect(map(movement).accessibilityLabel).toBe(
      "Incoming, Acme Payroll, plus 1,250.00 euros, pending, needs attention, 3 October 2026",
    );
  });

  it("announces every fact in the documented order, in Spanish", () => {
    const movement = buildMovement({ direction: "outbound", status: "pending", flagged: true });

    expect(map(movement, spanish).accessibilityLabel).toBe(
      "Cargo, Acme Payroll, menos 1250,00 euros, pendiente, requiere atención, 3 de octubre de 2026",
    );
  });

  it("leaves out status and attention when they do not apply", () => {
    expect(map(buildMovement({ direction: "outbound" }), spanish).accessibilityLabel).toBe(
      "Cargo, Acme Payroll, menos 1250,00 euros, 3 de octubre de 2026",
    );
  });

  it("keeps the full name in the label even when the title will be ellipsized", () => {
    const name = "The Very Long Named Neighbourhood Hardware And Garden Supplies Cooperative";

    expect(
      map(buildMovement({ counterparty: { name, imageUrl: null } })).accessibilityLabel,
    ).toContain(`, ${name}, `);
  });

  it.each([
    [english, "€0.00", "Outgoing, Acme Payroll, 0.00 euros, 3 October 2026"],
    [spanish, "0,00 €", "Cargo, Acme Payroll, 0,00 euros, 3 de octubre de 2026"],
  ])("shows and speaks an amount that rounds to zero without a sign", (i18n, text, label) => {
    const props = map(
      buildMovement({ direction: "outbound", amount: { value: 0.004, currency: "EUR" } }),
      i18n,
    );

    expect(props.amount.text).toBe(text);
    expect(props.accessibilityLabel).toBe(label);
  });

  it("decides the calendar day in the i18n time zone", () => {
    const lateNightUtc = buildMovement({ date: new Date("2026-10-07T23:30:00Z") });

    expect(map(lateNightUtc, createI18n("es", "es-ES", "UTC")).subtitle).toBe(
      "Salary · 7 oct 2026",
    );
    expect(map(lateNightUtc, createI18n("es", "es-ES", "Europe/Madrid")).subtitle).toBe(
      "Salary · 8 oct 2026",
    );
  });
});
