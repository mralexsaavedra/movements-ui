import type { ItemDto, ItemTypeDto } from "../dto/ItemDto";
import { type Random, between, chance, createRandom, pickWeighted } from "./random";

/** Fictional counterparties only. `logo: false` entries never have an image. */
interface Counterparty {
  readonly name: string;
  readonly category: string;
  /** Typical amount range in EUR. */
  readonly min: number;
  readonly max: number;
  readonly logo: boolean;
}

const MERCHANTS: readonly (readonly [Counterparty, number])[] = [
  [{ name: "Lumen Coffee Roasters", category: "Food & drink", min: 2, max: 12, logo: true }, 14],
  [{ name: "Harbor & Vine Market", category: "Groceries", min: 15, max: 180, logo: true }, 14],
  [{ name: "Saffron Street Kitchen", category: "Food & drink", min: 12, max: 70, logo: true }, 8],
  [{ name: "Orbit Streaming Co.", category: "Subscriptions", min: 8, max: 20, logo: true }, 5],
  [{ name: "Cobalt Mobility", category: "Transport", min: 3, max: 45, logo: true }, 9],
  [{ name: "Quill & Ledger Books", category: "Shopping", min: 10, max: 60, logo: false }, 5],
  [{ name: "Brightwater Utilities", category: "Utilities", min: 40, max: 160, logo: false }, 3],
  [{ name: "Atlas Fitness Club", category: "Health", min: 25, max: 60, logo: true }, 3],
  [{ name: "Juniper Pharmacy", category: "Health", min: 5, max: 40, logo: false }, 4],
  [{ name: "Northstar Air", category: "Travel", min: 80, max: 900, logo: true }, 2],
  [
    {
      name: "Kiyomizu Ramen House & Late Night Noodle Bar Shinjuku Station East Exit",
      category: "Travel",
      min: 9,
      max: 30,
      logo: false,
    },
    1,
  ],
  [
    {
      name: "The Riverside Neighbourhood Hardware, Paint & Garden Supply Cooperative",
      category: "Home",
      min: 6,
      max: 120,
      logo: true,
    },
    1,
  ],
];

const INCOME: readonly (readonly [Counterparty, number])[] = [
  [{ name: "Northwind Payroll", category: "Salary", min: 1800, max: 4200, logo: true }, 2],
  [{ name: "Pinecrest Refunds", category: "Refunds", min: 5, max: 120, logo: false }, 3],
];

const PEOPLE = ["Marta Ferrer", "Jonas Lindqvist", "Aiko Tanaka", "Lucas Moreau", "Sofia Rinaldi"];

/** EUR-dominant mix; the rate converts the EUR range into a plausible local amount. */
const CURRENCIES: readonly (readonly [{ code: string; rate: number; decimals: number }, number])[] =
  [
    [{ code: "EUR", rate: 1, decimals: 2 }, 85],
    [{ code: "USD", rate: 1.1, decimals: 2 }, 5],
    [{ code: "GBP", rate: 0.85, decimals: 2 }, 5],
    [{ code: "JPY", rate: 160, decimals: 0 }, 2.5],
    [{ code: "CHF", rate: 0.95, decimals: 2 }, 2.5],
  ];

const INBOUND_SHARE = 0.3;
const PERSON_TRANSFER_SHARE = 0.12;
const FLAGGED_SHARE = 0.05;
const MISSING_LOGO_SHARE = 0.15;
/** Only the most recent movements can still be pending. */
const RECENT_WINDOW = 40;
const RECENT_PENDING_SHARE = 0.35;
const OLD_PENDING_SHARE = 0.01;
/** Gap between consecutive movements, in minutes. */
const MIN_GAP_MINUTES = 5;
const MAX_GAP_MINUTES = 600;

export const DEFAULT_ANCHOR_DATE = "2026-10-08T18:30:00.000Z";

export interface GenerateItemDtosOptions {
  readonly seed: number;
  readonly total: number;
  /** Date of the newest movement; older ones go back from here. Fixed for determinism. */
  readonly anchorDate?: string;
}

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const pickCounterparty = (random: Random, type: ItemTypeDto): Counterparty => {
  if (chance(random, PERSON_TRANSFER_SHARE)) {
    const name = PEOPLE[Math.floor(random() * PEOPLE.length)] ?? "Marta Ferrer";
    return { name, category: "Transfers", min: 10, max: 500, logo: false };
  }
  return pickWeighted(random, type === "inbound" ? INCOME : MERCHANTS);
};

const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/**
 * Deterministic, contract-valid `ItemDto`s, newest first. Covers every visual state:
 * inbound/outbound, pending/confirmed, flagged, missing image, very long names, currencies.
 */
export const generateItemDtos = ({
  seed,
  total,
  anchorDate = DEFAULT_ANCHOR_DATE,
}: GenerateItemDtosOptions): ItemDto[] => {
  const random = createRandom(seed);
  const items: ItemDto[] = [];
  let time = Date.parse(anchorDate);

  for (let index = 0; index < total; index += 1) {
    const type: ItemTypeDto = chance(random, INBOUND_SHARE) ? "inbound" : "outbound";
    const counterparty = pickCounterparty(random, type);
    const currency = pickWeighted(random, CURRENCIES);
    const pendingShare = index < RECENT_WINDOW ? RECENT_PENDING_SHARE : OLD_PENDING_SHARE;
    const hasImage = counterparty.logo && !chance(random, MISSING_LOGO_SHARE);

    items.push({
      id: `mv-${String(index + 1).padStart(6, "0")}`,
      type,
      status: chance(random, pendingShare) ? "pending" : "confirmed",
      amount: {
        value: roundTo(
          between(random, counterparty.min, counterparty.max) * currency.rate,
          currency.decimals,
        ),
        currency: currency.code,
      },
      label: {
        name: counterparty.name,
        imageUrl: hasImage
          ? `https://images.example.com/merchants/${slugify(counterparty.name)}.png`
          : null,
      },
      category: counterparty.category,
      date: new Date(time).toISOString(),
      flagged: chance(random, FLAGGED_SHARE),
    });

    // Whole seconds keep the ISO strings short and the order strictly descending.
    time -= Math.round(between(random, MIN_GAP_MINUTES, MAX_GAP_MINUTES) * 60) * 1000;
  }

  return items;
};
