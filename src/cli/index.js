import fs from "node:fs/promises";
import path from "node:path";
import { buildWasherStl } from "../core/washer.js";

function toSlug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "washer";
}

function printHelp() {
  console.log(`
Washer STL generator

Usage:
  node src/cli/index.js --outer 30 --inner 10 --thickness 2 [options]
  node src/cli/index.js --input examples/batch.sample.json [options]

Required:
  Single mode:
    --outer <mm>       Outer diameter
    --inner <mm>       Inner diameter (0 allowed for solid disk)
    --thickness <mm>   Height along Z

  Batch mode:
    --input <file>     JSON file with an array of washer objects

Optional:
  --segments <n>     Circle smoothness (default: 128)
  --slice <mode>     Shape mode: full | quarter (default: full)
  --output <path>    Single mode output STL path (default: output/washer.stl)
  --output-dir <dir> Batch mode output directory (default: output)
  --name <text>      STL solid name (default: washer)
  --help             Show this help
`);
}

function parseArgs(argv) {
  const result = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);

    if (key === "help") {
      result.help = true;
      continue;
    }

    const value = argv[i + 1];
    if (value == null || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    result[key] = value;
    i += 1;
  }

  return result;
}

async function generateSingle(args) {
  const outputPath = args.output || path.join("output", "washer.stl");
  const name = args.name || "washer";
  const segments = args.segments == null ? undefined : Number(args.segments);
  const slice = args.slice || "full";

  const { stl, meta } = buildWasherStl(
    {
      outerDiameter: args.outer,
      innerDiameter: args.inner,
      thickness: args.thickness
    },
    { segments, name, slice }
  );

  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, stl, "utf8");

  console.log("STL generated successfully.");
  console.log(`Path: ${outputPath}`);
  console.log(
    `Params (mm): outer=${meta.outerDiameter}, inner=${meta.innerDiameter}, thickness=${meta.thickness}`
  );
  console.log(`Slice: ${meta.slice}`);
  console.log(`Segments: ${meta.segments}`);
  console.log(`Triangles: ${meta.triangleCount}`);
}

async function readBatchInput(inputPath) {
  const json = await fs.readFile(inputPath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(`Invalid JSON in ${inputPath}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Batch input must be a JSON array of washer objects.");
  }
  return parsed;
}

async function generateBatch(args) {
  const outputDir = args["output-dir"] || "output";
  const globalSegments = args.segments == null ? undefined : Number(args.segments);
  const globalSlice = args.slice || "full";
  const items = await readBatchInput(args.input);

  if (items.length === 0) {
    throw new Error("Batch input array is empty.");
  }

  await fs.mkdir(outputDir, { recursive: true });

  let totalTriangles = 0;
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (typeof item !== "object" || item == null || Array.isArray(item)) {
      throw new Error(`Batch item at index ${i} must be an object.`);
    }

    const name = item.name || args.name || `washer_${i + 1}`;
    const segments = item.segments == null ? globalSegments : Number(item.segments);
    const slice = item.slice || globalSlice;
    const outputFile = item.output || `${toSlug(name)}.stl`;
    const outputPath = path.join(outputDir, outputFile);

    const { stl, meta } = buildWasherStl(
      {
        outerDiameter: item.outerDiameter,
        innerDiameter: item.innerDiameter,
        thickness: item.thickness
      },
      { segments, name, slice }
    );

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, stl, "utf8");
    totalTriangles += meta.triangleCount;

    console.log(
      `[${i + 1}/${items.length}] ${outputPath} | outer=${meta.outerDiameter} inner=${meta.innerDiameter} thickness=${meta.thickness} | slice=${meta.slice} | segments=${meta.segments} | triangles=${meta.triangleCount}`
    );
  }

  console.log(`Batch complete. Generated ${items.length} file(s).`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Total triangles: ${totalTriangles}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (args.input) {
    await generateBatch(args);
    return;
  }

  await generateSingle(args);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
