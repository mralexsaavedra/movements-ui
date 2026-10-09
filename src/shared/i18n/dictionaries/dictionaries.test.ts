import { en } from "./en";
import { es } from "./es";

const keyPaths = (node: object, prefix = ""): string[] =>
  Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null ? keyPaths(value, path) : [path];
  });

describe("dictionaries", () => {
  it("expose the same keys in Spanish and English", () => {
    expect(keyPaths(es).toSorted()).toEqual(keyPaths(en).toSorted());
  });

  it("never leave a translation empty", () => {
    for (const dictionary of [en, es]) {
      for (const path of keyPaths(dictionary)) {
        const value = path.split(".").reduce<unknown>((node, key) => {
          return (node as Record<string, unknown>)[key];
        }, dictionary);
        expect([path, typeof value === "string" && value.trim().length > 0]).toEqual([path, true]);
      }
    }
  });
});
