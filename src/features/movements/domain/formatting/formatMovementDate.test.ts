import { formatMovementDate, formatMovementDateForAccessibility } from "./formatMovementDate";

describe("formatMovementDate", () => {
  const date = new Date("2026-10-07T09:15:00Z");

  it("formats a short date in es-ES by default", () => {
    expect(formatMovementDate(date, undefined, "UTC")).toBe("7 oct 2026");
  });

  it("accepts another locale", () => {
    expect(formatMovementDate(date, "en-GB", "UTC")).toBe("7 Oct 2026");
  });

  it("uses the requested time zone to decide the calendar day", () => {
    const lateNightUtc = new Date("2026-10-07T23:30:00Z");

    expect(formatMovementDate(lateNightUtc, "es-ES", "UTC")).toBe("7 oct 2026");
    expect(formatMovementDate(lateNightUtc, "es-ES", "Europe/Madrid")).toBe("8 oct 2026");
  });
});

describe("formatMovementDateForAccessibility", () => {
  const date = new Date("2026-10-07T09:15:00Z");

  it.each([
    ["es-ES", "7 de octubre de 2026"],
    ["en-GB", "7 October 2026"],
  ])(
    "spells the month out in %s so screen readers do not read an abbreviation",
    (locale, expected) => {
      expect(formatMovementDateForAccessibility(date, locale, "UTC")).toBe(expected);
    },
  );
});

describe("formatter cache", () => {
  afterEach(() => jest.restoreAllMocks());

  it("builds one Intl formatter per locale, time zone and style, however many dates it formats", () => {
    const construct = jest.spyOn(Intl, "DateTimeFormat");
    // A combination no other test uses, so the cache starts cold.
    const timeZone = "Pacific/Kiritimati";

    for (let day = 1; day <= 20; day += 1) {
      formatMovementDate(new Date(Date.UTC(2026, 9, day, 12)), "es-ES", timeZone);
    }

    expect(construct).toHaveBeenCalledTimes(1);
  });

  it("never reads the device time zone", () => {
    const resolvedOptions = jest.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions");

    formatMovementDate(new Date("2026-10-07T12:00:00Z"), "en-GB", "UTC");
    formatMovementDateForAccessibility(new Date("2026-10-07T12:00:00Z"), "en-GB", "UTC");

    expect(resolvedOptions).not.toHaveBeenCalled();
  });
});
