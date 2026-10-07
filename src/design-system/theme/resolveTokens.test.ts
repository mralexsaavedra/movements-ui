import { resolveTokens } from "./resolveTokens";

describe("resolveTokens", () => {
  const primitive = {
    color: { green: { "600": { $value: "green-600-value", $type: "color" } } },
    space: { "4": { $value: 16, $type: "dimension" } },
  };

  it("resolves a simple alias to the referenced value", () => {
    const tokens = {
      color: { text: { positive: { $value: "{color.green.600}", $type: "color" } } },
    };

    expect(resolveTokens(tokens, [primitive, tokens])).toEqual({
      color: { text: { positive: "green-600-value" } },
    });
  });

  it("resolves nested aliases across layers", () => {
    const semantic = { spacing: { md: { $value: "{space.4}", $type: "dimension" } } };
    const component = { itemCard: { padding: { $value: "{spacing.md}", $type: "dimension" } } };

    expect(resolveTokens(component, [primitive, semantic, component])).toEqual({
      itemCard: { padding: 16 },
    });
  });

  it("leaves non-alias values untouched and drops $-prefixed metadata", () => {
    const tokens = {
      $description: "group metadata",
      opacity: { half: { $value: 0.5, $type: "number" } },
      label: { $value: "plain {text}", $type: "string" },
    };

    expect(resolveTokens(tokens, [tokens])).toEqual({
      opacity: { half: 0.5 },
      label: "plain {text}",
    });
  });

  it("throws on an unknown reference, naming the token path", () => {
    const tokens = { itemCard: { padding: { $value: "{spacing.huge}", $type: "dimension" } } };

    expect(() => resolveTokens(tokens, [primitive, tokens])).toThrow(
      'Unknown token reference "{spacing.huge}" in "itemCard.padding"',
    );
  });

  it("throws on a reference cycle, showing the chain", () => {
    const tokens = {
      a: { $value: "{b}", $type: "dimension" },
      b: { $value: "{c}", $type: "dimension" },
      c: { $value: "{a}", $type: "dimension" },
    };

    expect(() => resolveTokens(tokens, [tokens])).toThrow(
      "Token reference cycle: a -> b -> c -> a",
    );
  });

  it("throws when two layers define the same token path", () => {
    const duplicate = { space: { "4": { $value: 20, $type: "dimension" } } };

    expect(() => resolveTokens(duplicate, [primitive, duplicate])).toThrow(
      'Duplicate token path "space.4"',
    );
  });
});
