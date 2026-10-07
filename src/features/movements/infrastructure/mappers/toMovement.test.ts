import { buildItemDto, itemDtos } from "../__fixtures__/itemDtos";
import { toMovement } from "./toMovement";

describe("toMovement", () => {
  it("maps every contract field to the domain entity", () => {
    const movement = toMovement(itemDtos[2]);

    expect(movement).toEqual({
      id: "mv-0003",
      direction: "outbound",
      status: "pending",
      amount: { value: 89.99, currency: "USD" },
      counterparty: {
        name: "Orbit Streaming Co.",
        imageUrl: "https://images.example.com/orbit.png",
      },
      category: "Subscriptions",
      date: new Date("2026-10-05T21:40:12.250Z"),
      flagged: true,
    });
  });

  it.each(["inbound", "outbound"] as const)("maps type %s to direction", (type) => {
    expect(toMovement(buildItemDto({ type })).direction).toBe(type);
  });

  it("parses the ISO date into a Date honouring the offset", () => {
    const movement = toMovement(buildItemDto({ date: "2026-10-06T08:00:00+02:00" }));

    expect(movement.date).toBeInstanceOf(Date);
    expect(movement.date.toISOString()).toBe("2026-10-06T06:00:00.000Z");
  });

  it("keeps a missing image as null", () => {
    const movement = toMovement(buildItemDto({ label: { name: "Northwind", imageUrl: null } }));

    expect(movement.counterparty.imageUrl).toBeNull();
  });
});
