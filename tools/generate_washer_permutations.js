import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const THICKNESSES_MM = [0.5, 1, 2, 3, 4, 5];
const INNER_DIAMETER_MIN_MM = 2;
const INNER_DIAMETER_MAX_MM = 10;
const TOLERANCES_MM = [0.2];

function toPathToken(value) {
  return String(value).replace(".", "p");
}

function buildPermutations() {
  const items = [];

  for (const thickness of THICKNESSES_MM) {
    for (let innerDiameter = INNER_DIAMETER_MIN_MM; innerDiameter <= INNER_DIAMETER_MAX_MM; innerDiameter += 1) {
      const outerMin = innerDiameter + 2;
      const outerMax = 2 * innerDiameter + 2;

      for (let outerDiameter = outerMin; outerDiameter <= outerMax; outerDiameter += 1) {
        const name = `washer_thickness_${thickness}_inner_${innerDiameter}_outer_${outerDiameter}`;
        const output = `nominal/${name}.stl`;

        items.push({
          name,
          innerDiameter,
          outerDiameter,
          thickness,
          output
        });
      }
    }
  }

  return items;
}

function buildTolerancePermutations(baseItems) {
  const items = [];

  for (const base of baseItems) {
    const { name: baseName, innerDiameter: origInner, outerDiameter, thickness } = base;

    for (const tolerance of TOLERANCES_MM) {
      const innerDiameter = origInner + tolerance;
      const tolToken = toPathToken(tolerance);
      const name = `${baseName}_tolerance_${tolToken}`;
      const output = `tolerance_0p2/${name}.stl`;

      items.push({
        name,
        innerDiameter,
        outerDiameter,
        thickness,
        output
      });
    }
  }

  return items;
}

async function main() {
  const baseItems = buildPermutations();
  const toleranceItems = buildTolerancePermutations(baseItems);

  const examplesDir = path.join(projectRoot, "examples");
  await fs.mkdir(examplesDir, { recursive: true });

  const basePath = path.join(examplesDir, "batch.permutations.json");
  await fs.writeFile(basePath, `${JSON.stringify(baseItems, null, 2)}\n`, "utf8");
  console.log(`Wrote ${baseItems.length} permutations to ${basePath}`);

  const tolerancePath = path.join(examplesDir, "batch.permutations.tolerance.json");
  await fs.writeFile(tolerancePath, `${JSON.stringify(toleranceItems, null, 2)}\n`, "utf8");
  console.log(`Wrote ${toleranceItems.length} tolerance permutations to ${tolerancePath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
