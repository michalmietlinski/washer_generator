# Washer STL Generator (Pure JavaScript)

This project generates STL files for a permanent shape: a washer (annulus).

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
