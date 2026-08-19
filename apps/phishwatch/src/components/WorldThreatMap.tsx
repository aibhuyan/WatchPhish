import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
// Imported as a raw string (via Vite's ?raw) and parsed once, so TypeScript
// never has to infer a type for the ~800KB GeoJSON literal.
import worldRaw from "@/assets/world-countries.geojson?raw";

interface CountryProps {
  ISO_A2?: string;
  ISO_A2_EH?: string;
  NAME?: string;
  ADMIN?: string;
}

const world = JSON.parse(worldRaw) as FeatureCollection<Geometry, CountryProps>;

const WIDTH = 800;
const HEIGHT = 380;
const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], world);
const pathGen = geoPath(projection);

// Natural Earth encodes some ISO_A2 codes as "-99"; fall back to the "_EH"
// (de-facto) variant used for e.g. France and Norway.
function iso2(p: CountryProps): string | null {
  if (p.ISO_A2 && p.ISO_A2 !== "-99") return p.ISO_A2.toUpperCase();
  if (p.ISO_A2_EH && p.ISO_A2_EH !== "-99") return p.ISO_A2_EH.toUpperCase();
  return null;
}

const BASE_PATHS = world.features.map((f, i) => ({
  key: i,
  d: pathGen(f) || "",
  code: iso2(f.properties),
  name: f.properties.NAME || f.properties.ADMIN || "",
}));

interface HoverState {
  name: string;
  count: number;
  x: number;
  y: number;
}

export default function WorldThreatMap({
  data,
}: {
  data: Array<{ countryCode: string; count: number }>;
}) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of data) m.set(d.countryCode.toUpperCase(), d.count);
    return m;
  }, [data]);

  const max = useMemo(
    () => Math.max(1, ...data.map((d) => d.count)),
    [data],
  );

  const [hover, setHover] = useState<HoverState | null>(null);

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label="Global phishing threat distribution by hosting country"
        onMouseLeave={() => setHover(null)}
      >
        {BASE_PATHS.map((f) => {
          const count = f.code ? counts.get(f.code) ?? 0 : 0;
          const intensity = count > 0 ? 0.18 + 0.82 * (count / max) : 0;
          return (
            <path
              key={f.key}
              d={f.d}
              fill={count > 0 ? `rgba(223,32,32,${intensity})` : "rgba(125,135,150,0.14)"}
              stroke="rgba(125,135,150,0.35)"
              strokeWidth={0.4}
              className="cursor-default transition-opacity hover:opacity-75"
              onMouseMove={(e) =>
                setHover({ name: f.name, count, x: e.clientX, y: e.clientY })
              }
            />
          );
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none fixed z-50 rounded border border-border bg-surface px-2 py-1 text-xs text-foreground shadow-lg"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <span className="font-medium">{hover.name || "Unknown"}</span>
          <span className="ml-2 text-muted-foreground">
            {hover.count} threat{hover.count === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </div>
  );
}
