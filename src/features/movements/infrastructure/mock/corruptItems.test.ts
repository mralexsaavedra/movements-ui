import { itemDtos } from "../__fixtures__/itemDtos";
import { itemSchema } from "../schemas/itemSchema";
import { CORRUPTIONS, corruptItems } from "./corruptItems";
import { generateItemDtos } from "./generateItemDtos";

const sources = [...itemDtos, ...generateItemDtos({ seed: 42, total: 20 })];

describe("corruptItems", () => {
  it.each(CORRUPTIONS.map(([corruption], index) => [index, corruption] as const))(
    "corruption #%i breaks the contract for every source item",
    (_, corruption) => {
      const accepted = sources.filter((item) => itemSchema.safeParse(corruption(item)).success);

      expect(accepted).toEqual([]);
    },
  );

  it("keeps the ids of corrupted items so drops stay traceable", () => {
    for (const [corruption] of CORRUPTIONS) {
      expect(corruption(itemDtos[0])).toHaveProperty("id", itemDtos[0].id);
    }
  });

  it("returns the items untouched when the rate is 0", () => {
    expect(corruptItems(sources, { seed: 1, rate: 0 })).toEqual(sources);
  });
});
