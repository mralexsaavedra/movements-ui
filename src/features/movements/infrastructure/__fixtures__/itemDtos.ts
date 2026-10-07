import type { ItemDto, ItemsPageDto } from "../dto/ItemDto";

/** Contract-valid items with fictional merchants, covering every visual state. */
export const itemDtos = [
  {
    id: "mv-0001",
    type: "outbound",
    status: "confirmed",
    amount: { value: 42.9, currency: "EUR" },
    label: { name: "Lumen Coffee Roasters", imageUrl: "https://images.example.com/lumen.png" },
    category: "Food & drink",
    date: "2026-10-07T09:15:00Z",
    flagged: false,
  },
  {
    id: "mv-0002",
    type: "inbound",
    status: "confirmed",
    amount: { value: 12345.5, currency: "EUR" },
    label: { name: "Northwind Payroll", imageUrl: null },
    category: "Salary",
    date: "2026-10-06T08:00:00+02:00",
    flagged: false,
  },
  {
    id: "mv-0003",
    type: "outbound",
    status: "pending",
    amount: { value: 89.99, currency: "USD" },
    label: { name: "Orbit Streaming Co.", imageUrl: "https://images.example.com/orbit.png" },
    category: "Subscriptions",
    date: "2026-10-05T21:40:12.250Z",
    flagged: true,
  },
  {
    id: "mv-0004",
    type: "outbound",
    status: "confirmed",
    amount: { value: 3500, currency: "JPY" },
    label: {
      name: "Kiyomizu Ramen House & Late Night Noodle Bar Shinjuku Station East Exit",
      imageUrl: null,
    },
    category: "Travel",
    date: "2026-10-04T12:00:00+09:00",
    flagged: false,
  },
  {
    id: "mv-0005",
    type: "inbound",
    status: "pending",
    amount: { value: 0, currency: "EUR" },
    label: { name: "Pinecrest Refunds", imageUrl: null },
    category: "Refunds",
    date: "2026-10-03T17:30:00Z",
    flagged: false,
  },
] as const satisfies readonly ItemDto[];

export const buildItemDto = (overrides: Partial<ItemDto> = {}): ItemDto => ({
  ...itemDtos[0],
  ...overrides,
});

export const buildItemsPageDto = (overrides: Partial<ItemsPageDto> = {}): ItemsPageDto => ({
  items: itemDtos,
  nextCursor: "cursor-2",
  ...overrides,
});
