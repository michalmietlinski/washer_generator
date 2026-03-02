/**
 * Prepares batch JSON files for washer STL generation.
 *
 * Batch 1 (nominal): inner 3–10 mm, outer = inner + 3 mm, thickness 4–10 step 1, 10–30 step 2.
 * Batch 2 (tolerance): same (inner, outer) pairs as nominal but inner + 0.2 mm (one variant per nominal);
 *   outer stays the same (6–13 mm). 136 items, same count as nominal.
 *
 * Usage: node tools/prepare_batch.js
 * Then:  npm run generate -- --input examples/batch.distances.nominal.json --output-dir output/nominal
 *        npm run generate -- --input examples/batch.distances.tolerance.json --output-dir output/tolerance
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

// Thickness: 4–10 step 1 mm, then 10–30 step 2 mm (no duplicate 10)
const THICKNESSES_MM = [
  ...Array.from({ length: 7 }, (_, i) => 4 + i),   // 4..10
  ...Array.from({ length: 10 }, (_, i) => 10 + (i + 1) * 2)  // 12,14,...,30
];

const INNER_MIN_NOMINAL = 3;
const INNER_MAX_NOMINAL = 10;
const TOLERANCE_OFFSET = 0.2;  // tolerance inner = nominal inner + this (outer unchanged)
const OUTER_OFFSET = 3;

const PAD_WIDTH = 2;  // inner/outer/height up to 2 digits for sort-friendly names

function pad(num, width = PAD_WIDTH) {
  return String(Math.round(num)).padStart(width, "0");
}

/** For filenames: zero-padded, decimal as underscore (3.4 → "03_4"); sort-friendly. */
function nameSegment(value) {
  const v = Math.round(Number(value) * 100) / 100;
  if (Number.isInteger(v)) return pad(v);
  const [intPart, decPart] = String(v).split(".");
  return `${pad(Number(intPart))}_${decPart}`;
}

function buildNominalBatch() {
  const items = [];
  for (let inner = INNER_MIN_NOMINAL; inner <= INNER_MAX_NOMINAL; inner += 1) {
    const outer = inner + OUTER_OFFSET;
    for (const thickness of THICKNESSES_MM) {
      const name = `inner_${pad(inner)}_outer_${pad(outer)}_height_${nameSegment(thickness)}`;
      items.push({
        name,
        innerDiameter: inner,
        outerDiameter: outer,
        thickness
      });
    }
  }
  return items;
}

function buildToleranceBatch() {
  const items = [];
  for (let inner = INNER_MIN_NOMINAL; inner <= INNER_MAX_NOMINAL; inner += 1) {
    const outer = inner + OUTER_OFFSET;
    const innerR = Math.round((inner + TOLERANCE_OFFSET) * 100) / 100;
    for (const thickness of THICKNESSES_MM) {
      const name = `inner_${nameSegment(innerR)}_outer_${pad(outer)}_height_${nameSegment(thickness)}`;
      items.push({
        name,
        innerDiameter: innerR,
        outerDiameter: outer,
        thickness
      });
    }
  }
  return items;
}

async function main() {
  const examplesDir = path.join(projectRoot, "examples");
  await fs.mkdir(examplesDir, { recursive: true });

  const nominal = buildNominalBatch();
  const nominalPath = path.join(examplesDir, "batch.distances.nominal.json");
  await fs.writeFile(nominalPath, JSON.stringify(nominal, null, 2) + "\n", "utf8");
  console.log(`Wrote ${nominal.length} items to ${nominalPath}`);

  const tolerance = buildToleranceBatch();
  const tolerancePath = path.join(examplesDir, "batch.distances.tolerance.json");
  await fs.writeFile(tolerancePath, JSON.stringify(tolerance, null, 2) + "\n", "utf8");
  console.log(`Wrote ${tolerance.length} items to ${tolerancePath}`);

  console.log(`
Thicknesses (mm): ${THICKNESSES_MM.join(", ")}
Nominal: inner ${INNER_MIN_NOMINAL}–${INNER_MAX_NOMINAL} mm, outer = inner + ${OUTER_OFFSET} mm
Tolerance: inner = nominal + ${TOLERANCE_OFFSET} mm, same outer (${INNER_MIN_NOMINAL}+${OUTER_OFFSET}–${INNER_MAX_NOMINAL}+${OUTER_OFFSET} mm)

Generate STLs:
  npm run generate -- --input examples/batch.distances.nominal.json --output-dir output/nominal
  npm run generate -- --input examples/batch.distances.tolerance.json --output-dir output/tolerance
`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
