import { renderWithoutCatalogArgs } from "./renderWithoutCatalogArgs";

type Context = Parameters<typeof renderWithoutCatalogArgs>[1];

describe("renderWithoutCatalogArgs", () => {
  it("fails loudly when the story has neither a component nor its own render", () => {
    const context = { component: undefined, title: "Broken/Story" } as unknown as Context;

    expect(() => renderWithoutCatalogArgs({}, context)).toThrow(/Broken\/Story/);
  });
});
