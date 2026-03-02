# Washer STL Generator (Pure JavaScript)

Not everyone knows CAD, so this generator lets you create different washer sizes without modeling them yourself. Pick inner and outer diameter and thickness, and get an STL—or run a batch to generate hundreds of permutations at once.

**Dimensions (millimeters):**

- **Inner diameter (hole):** any value you need; the included batches use 3–10 mm (integer) for nominal, and the same sizes + 0.2 mm for tolerance variants (outer unchanged).
- **Outer diameter:** any value > inner; the included batches use outer = inner + 3 mm.
- **Thickness:** any value; the included batches use 4–10 mm (1 mm step) and 10–30 mm (2 mm step).

**Printing:**

- **Orientation:** Flat side on the build plate (no supports).
- **Layer height:** 0.2 mm or finer recommended for thin washers.
- **Material:** PLA, PETG, or similar; dimensions are tuned for FDM.

**Get it:** [github.com/michalmietlinski/washer_generator](https://github.com/michalmietlinski/washer_generator)

---

This project generates STL files for a washer (annulus). All dimensions are in millimeters.

## Shape parameters

All values are in millimeters:

- `outerDiameter` (> 0)
- `innerDiameter` (>= 0; `0` means solid disk)
- `thickness` (> 0)
- `segments` (>= 3; controls smoothness of circular approximation)
- `slice` (`full` or `quarter`; `quarter` outputs a 90 degree section)

## How the geometry is created

1. Validate all dimensions.
2. Convert diameters to radii.
3. Sample `segments` points around the circle.
4. Build triangle strips for:
   - Top face
   - Bottom face
   - Outer side wall
   - Inner side wall (if `innerDiameter > 0`)
5. Compute normals and serialize to ASCII STL.

Because STL is triangle-based, circles are approximated with polygons. Increase
`segments` for smoother results and larger files.

## CLI usage

Generate an STL file:

```bash
npm run generate -- --outer 30 --inner 10 --thickness 2 --segments 160 --output output/washer.stl
```

Generate only one quarter of the washer:

```bash
npm run generate -- --outer 30 --inner 10 --thickness 2 --slice quarter --output output/washer_quarter.stl
```

Generate many STL files from one JSON array:

```bash
npm run generate -- --input examples/batch.sample.json --output-dir output/batch --segments 128
```

**Pre-generated distance batches** (inner/outer/thickness grids):

```bash
npm run prepare-batch
```

This writes:

- `examples/batch.distances.nominal.json` — inner 3–10 mm, outer = inner + 3 mm, thickness 4–10 step 1 mm, 10–30 step 2 mm
- `examples/batch.distances.tolerance.json` — same (inner, outer) pairs as nominal but inner + 0.2 mm (136 items; for a separate output directory)

Then generate STLs:

```bash
npm run generate -- --input examples/batch.distances.nominal.json --output-dir output/nominal
npm run generate -- --input examples/batch.distances.tolerance.json --output-dir output/tolerance
```

Batch JSON format (`--input`):

- Top-level must be an array.
- Each element is an object with:
  - `outerDiameter`
  - `innerDiameter`
  - `thickness`
- Optional per-element fields:
  - `name` (used for STL solid name and default filename)
  - `segments` (overrides CLI `--segments`)
  - `slice` (`full` or `quarter`; overrides CLI `--slice`)
  - `output` (relative path inside `--output-dir`)

Example:

```json
[
  { "name": "washer_a", "outerDiameter": 30, "innerDiameter": 10, "thickness": 2, "slice": "full" },
  { "name": "disk_b", "outerDiameter": 25, "innerDiameter": 0, "thickness": 3, "slice": "quarter", "output": "custom/disk_b.stl" }
]
```

Show help:

```bash
node src/cli/index.js --help
```

## Browser usage

Run local web server:

```bash
npm run web
```

Then open:

`http://127.0.0.1:5173/web/index.html`

Fill dimensions and click "Generate & Download STL".
