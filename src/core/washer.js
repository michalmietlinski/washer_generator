const TAU = Math.PI * 2;
const DEFAULT_SEGMENTS = 128;
const SLICE_FULL = "full";
const SLICE_QUARTER = "quarter";

function toFiniteNumber(value, label) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return num;
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function length(v) {
  return Math.sqrt(dot(v, v));
}

function normalize(v) {
  const len = length(v);
  if (len === 0) {
    return [0, 0, 0];
  }
  return [v[0] / len, v[1] / len, v[2] / len];
}

function triangleNormal(triangle) {
  const [a, b, c] = triangle;
  const ab = subtract(b, a);
  const ac = subtract(c, a);
  return normalize(cross(ab, ac));
}

function orientTriangle(triangle, normalHint) {
  const normal = triangleNormal(triangle);
  if (dot(normal, normalHint) >= 0) {
    return triangle;
  }
  return [triangle[0], triangle[2], triangle[1]];
}

function createCirclePoint(radius, angle, z) {
  return [radius * Math.cos(angle), radius * Math.sin(angle), z];
}

function normalizeSlice(value) {
  const slice = value == null ? SLICE_FULL : String(value).toLowerCase();
  if (slice !== SLICE_FULL && slice !== SLICE_QUARTER) {
    throw new Error(`slice must be "${SLICE_FULL}" or "${SLICE_QUARTER}".`);
  }
  return slice;
}

function formatStlNumber(value) {
  if (Math.abs(value) < 1e-12) {
    return "0";
  }
  return Number(value.toFixed(8)).toString();
}

export function validateWasherParams(rawParams) {
  const outerDiameter = toFiniteNumber(rawParams.outerDiameter, "outerDiameter");
  const innerDiameter = toFiniteNumber(rawParams.innerDiameter, "innerDiameter");
  const thickness = toFiniteNumber(rawParams.thickness, "thickness");

  if (outerDiameter <= 0) {
    throw new Error("outerDiameter must be > 0.");
  }
  if (innerDiameter < 0) {
    throw new Error("innerDiameter must be >= 0.");
  }
  if (thickness <= 0) {
    throw new Error("thickness must be > 0.");
  }
  if (outerDiameter <= innerDiameter) {
    throw new Error("outerDiameter must be greater than innerDiameter.");
  }

  return {
    outerDiameter,
    innerDiameter,
    thickness
  };
}

export function buildWasherMesh(rawParams, rawOptions = {}) {
  const { outerDiameter, innerDiameter, thickness } = validateWasherParams(rawParams);
  const segmentsInput = rawOptions.segments ?? DEFAULT_SEGMENTS;
  const segments = Math.floor(toFiniteNumber(segmentsInput, "segments"));
  const slice = normalizeSlice(rawOptions.slice);

  if (segments < 3) {
    throw new Error("segments must be >= 3.");
  }

  const isQuarter = slice === SLICE_QUARTER;
  const angleStart = 0;
  const angleSpan = isQuarter ? Math.PI / 2 : TAU;
  const sweepSegments = isQuarter ? Math.max(1, Math.floor(segments / 4)) : segments;

  const outerRadius = outerDiameter / 2;
  const innerRadius = innerDiameter / 2;
  const zBottom = 0;
  const zTop = thickness;
  const triangles = [];

  for (let i = 0; i < sweepSegments; i += 1) {
    const a0 = angleStart + (i / sweepSegments) * angleSpan;
    const a1 = angleStart + ((i + 1) / sweepSegments) * angleSpan;
    const aMid = (a0 + a1) / 2;

    const outerBottom0 = createCirclePoint(outerRadius, a0, zBottom);
    const outerBottom1 = createCirclePoint(outerRadius, a1, zBottom);
    const outerTop0 = createCirclePoint(outerRadius, a0, zTop);
    const outerTop1 = createCirclePoint(outerRadius, a1, zTop);

    if (innerRadius > 0) {
      const innerBottom0 = createCirclePoint(innerRadius, a0, zBottom);
      const innerBottom1 = createCirclePoint(innerRadius, a1, zBottom);
      const innerTop0 = createCirclePoint(innerRadius, a0, zTop);
      const innerTop1 = createCirclePoint(innerRadius, a1, zTop);

      triangles.push(
        orientTriangle([outerTop0, outerTop1, innerTop1], [0, 0, 1]),
        orientTriangle([outerTop0, innerTop1, innerTop0], [0, 0, 1]),
        orientTriangle([outerBottom0, innerBottom1, outerBottom1], [0, 0, -1]),
        orientTriangle([outerBottom0, innerBottom0, innerBottom1], [0, 0, -1])
      );

      const outerHint = [Math.cos(aMid), Math.sin(aMid), 0];
      const innerHint = [-Math.cos(aMid), -Math.sin(aMid), 0];

      triangles.push(
        orientTriangle([outerBottom0, outerBottom1, outerTop1], outerHint),
        orientTriangle([outerBottom0, outerTop1, outerTop0], outerHint),
        orientTriangle([innerBottom0, innerTop1, innerBottom1], innerHint),
        orientTriangle([innerBottom0, innerTop0, innerTop1], innerHint)
      );
    } else {
      const centerTop = [0, 0, zTop];
      const centerBottom = [0, 0, zBottom];
      const outerHint = [Math.cos(aMid), Math.sin(aMid), 0];

      triangles.push(
        orientTriangle([centerTop, outerTop0, outerTop1], [0, 0, 1]),
        orientTriangle([centerBottom, outerBottom1, outerBottom0], [0, 0, -1]),
        orientTriangle([outerBottom0, outerBottom1, outerTop1], outerHint),
        orientTriangle([outerBottom0, outerTop1, outerTop0], outerHint)
      );
    }
  }

  if (isQuarter) {
    const capAngles = [angleStart, angleStart + angleSpan];

    for (const angle of capAngles) {
      const outerBottom = createCirclePoint(outerRadius, angle, zBottom);
      const outerTop = createCirclePoint(outerRadius, angle, zTop);
      const innerBottom = createCirclePoint(innerRadius, angle, zBottom);
      const innerTop = createCirclePoint(innerRadius, angle, zTop);
      const capHint = [Math.sin(angle), -Math.cos(angle), 0];

      triangles.push(
        orientTriangle([outerBottom, outerTop, innerTop], capHint),
        orientTriangle([outerBottom, innerTop, innerBottom], capHint)
      );
    }
  }

  return {
    triangles,
    meta: {
      outerDiameter,
      innerDiameter,
      thickness,
      outerRadius,
      innerRadius,
      segments,
      sweepSegments,
      slice,
      triangleCount: triangles.length
    }
  };
}

export function serializeAsciiStl(name, triangles) {
  const solidName = (name || "washer").replace(/\s+/g, "_");
  const lines = [`solid ${solidName}`];

  for (const triangle of triangles) {
    const normal = triangleNormal(triangle);
    lines.push(
      `  facet normal ${formatStlNumber(normal[0])} ${formatStlNumber(normal[1])} ${formatStlNumber(normal[2])}`,
      "    outer loop",
      `      vertex ${formatStlNumber(triangle[0][0])} ${formatStlNumber(triangle[0][1])} ${formatStlNumber(triangle[0][2])}`,
      `      vertex ${formatStlNumber(triangle[1][0])} ${formatStlNumber(triangle[1][1])} ${formatStlNumber(triangle[1][2])}`,
      `      vertex ${formatStlNumber(triangle[2][0])} ${formatStlNumber(triangle[2][1])} ${formatStlNumber(triangle[2][2])}`,
      "    endloop",
      "  endfacet"
    );
  }

  lines.push(`endsolid ${solidName}`);
  return lines.join("\n");
}

export function buildWasherStl(params, options = {}) {
  const { triangles, meta } = buildWasherMesh(params, options);
  const stl = serializeAsciiStl(options.name || "washer", triangles);
  return { stl, meta };
}
