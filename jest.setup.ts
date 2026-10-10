/**
 * FlashList in Jest: there is no native layout, so its measurements are mocked (400×900 viewport,
 * 100-tall rows) and lists mount real rows. This is the measurement half of the package's own
 * `@shopify/flash-list/jestSetup`; its other half remaps `FlashList` to a `RecyclerView` export
 * that 2.0.2 no longer has (it leaves `FlashList` undefined), and `FlashList` is already the
 * `RecyclerView` in v2.
 */
jest.mock("@shopify/flash-list/dist/recyclerview/utils/measureLayout", () => {
  const actual = jest.requireActual<object>(
    "@shopify/flash-list/dist/recyclerview/utils/measureLayout",
  );
  const viewport = { x: 0, y: 0, width: 400, height: 900 };
  return {
    ...actual,
    measureParentSize: jest.fn(() => viewport),
    measureFirstChildLayout: jest.fn(() => viewport),
    measureItemLayout: jest.fn(() => ({ x: 0, y: 0, width: 100, height: 100 })),
  };
});
