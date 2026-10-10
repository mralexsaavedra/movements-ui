/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Mocks FlashList's layout measurements so list tests mount real rows (see the file).
  setupFiles: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/e2e/"],
  // Only packages that ship untranspiled ESM/Flow and are actually installed here.
  // `nodeLinker: hoisted` places them at the top of node_modules, so the `.pnpm`
  // alternative used by jest-expo's default (for the isolated linker, where real
  // paths live under node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>) is not needed.
  // Add a package here only when a test fails with a "SyntaxError: Cannot use import".
  transformIgnorePatterns: [
    // `storybook` and `@storybook/*` ship ESM only (portable stories in `src/storybook/stories.test.tsx`);
    // so does `@noble/ciphers` (cache encryption in `src/shared/storage/`).
    "/node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|storybook/|@storybook/|@noble/ciphers/))",
    // Kept from jest-expo's defaults: the RN babel preset is part of the transformer itself.
    "/node_modules/@react-native/babel-preset/",
  ],
};
