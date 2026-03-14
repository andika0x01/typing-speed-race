import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const lstPath = resolve(__dirname, "../public/01-kbbi3-2001-sort-alpha.lst");
const outputPath = resolve(__dirname, "../src/worker/lib/words.ts");

const raw = readFileSync(lstPath, "utf-8");
const words = raw
  .split(/\r?\n/)
  .map((w) => w.trim())
  .filter((w) => w.length >= 3 && w.length <= 10 && /^[a-z]+$/.test(w));

const ts = `export const WORD_BANK: string[] = ${JSON.stringify(words, null, 0)};

export function generateWords(count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]);
  }
  return result;
}
`;

writeFileSync(outputPath, ts, "utf-8");
console.log(`Generated ${words.length} words -> ${outputPath}`);
