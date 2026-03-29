import { rewind } from "@turf/turf";

export type EstateRenderableGeometry =
  | GeoJSON.Polygon
  | GeoJSON.MultiPolygon;

export function hasRenderableEstateGeometry(
  geometry: GeoJSON.Geometry | null | undefined
): geometry is EstateRenderableGeometry {
  return Boolean(
    geometry &&
      (geometry.type === "Polygon" || geometry.type === "MultiPolygon")
  );
}

export function normalizeEstateGeometry(
  geometry: EstateRenderableGeometry
): EstateRenderableGeometry {
  const rewound = rewind(
    {
      type: "Feature",
      properties: {},
      geometry,
    },
    { mutate: false }
  );

  return rewound.geometry as EstateRenderableGeometry;
}
