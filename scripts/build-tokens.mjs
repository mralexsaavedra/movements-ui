#!/usr/bin/env node
/**
 * Generates one typed theme module per color mode from the DTCG token JSON with Style Dictionary.
 *
 *   node scripts/build-tokens.mjs           writes src/design-system/tokens/generated/<mode>.ts
 *   node scripts/build-tokens.mjs --check   fails if the committed files differ from a fresh build
 *
 * Primitives are passed as `include` (alias scope only); semantic + component tokens are the
 * `source` and the only tokens emitted. No transforms run, so values keep our unitless RN
 * convention (no px/rem) and hex colors stay as authored.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
import StyleDictionary from "style-dictionary";
import { fileHeader, minifyDictionary } from "style-dictionary/utils";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tokensDir = "src/design-system/tokens";
const outDir = path.join(tokensDir, "generated");
const modes = ["light", "dark"];

const FORMAT = "typescript/nested-const";

/** Nested `export const <name> = { ... } as const;` — the built-in `javascript/esm` format only
 *  emits an untyped `export default`, which loses the literal types the theme relies on. */
const nestedConstFormat = async ({ dictionary, file, options }) => {
  const header = await fileHeader({ file, commentStyle: "short" });
  const body = JSON.stringify(minifyDictionary(dictionary.tokens, options.usesDtcg), null, 2);
  return `${header}\nexport const ${options.exportName} = ${body} as const;\n`;
};

const configFor = (mode) => ({
  usesDtcg: true,
  log: { warnings: "error", verbosity: "silent" },
  include: [path.join(tokensDir, "primitive.json")],
  source: [
    path.join(tokensDir, "semantic.json"),
    path.join(tokensDir, `semantic.${mode}.json`),
    path.join(tokensDir, "component.json"),
  ],
  hooks: { formats: { [FORMAT]: nestedConstFormat } },
  platforms: {
    ts: {
      transforms: ["name/camel"],
      files: [
        {
          destination: path.join(outDir, `${mode}.ts`),
          format: FORMAT,
          filter: (token) => token.isSource,
          options: { exportName: `${mode}Tokens` },
        },
      ],
    },
  },
});

/** @returns {Promise<{ file: string; contents: string }[]>} */
async function generate() {
  const results = [];
  for (const mode of modes) {
    const sd = new StyleDictionary(configFor(mode));
    for (const { destination, output } of await sd.formatPlatform("ts")) {
      const file = path.join(root, String(destination));
      const prettierConfig = await prettier.resolveConfig(file);
      const contents = await prettier.format(String(output), { ...prettierConfig, filepath: file });
      results.push({ file, contents });
    }
  }
  return results;
}

const readOrEmpty = (file) => readFile(file, "utf8").catch(() => "");

process.chdir(root);
const outputs = await generate();

if (process.argv.includes("--check")) {
  const stale = [];
  for (const { file, contents } of outputs) {
    if ((await readOrEmpty(file)) !== contents) stale.push(path.relative(root, file));
  }
  if (stale.length > 0) {
    console.error(`Generated tokens are stale: ${stale.join(", ")}. Run \`pnpm tokens\`.`);
    process.exit(1);
  }
  console.log("Generated tokens are up to date.");
} else {
  await mkdir(path.join(root, outDir), { recursive: true });
  for (const { file, contents } of outputs) {
    await writeFile(file, contents);
    console.log(`Wrote ${path.relative(root, file)}`);
  }
}
