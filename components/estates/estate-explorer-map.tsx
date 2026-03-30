"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl, {
  type FilterSpecification,
  type LngLatBoundsLike,
  type MapLayerMouseEvent,
} from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import estatesGeoJson from "@/data/usvi-estates-firestore.json";
import {
  hasRenderableEstateGeometry,
  normalizeEstateGeometry,
} from "@/lib/usvi/estate-geometry";
import { findEstateHistory } from "@/lib/usvi/estate-history";
import {
  STJ_ESTATE_QUARTERS,
  STT_ESTATE_QUARTERS,
  STX_ESTATE_QUARTERS,
  type IslandQuarterMap,
} from "@/lib/usvi/estate-quarters";

type IslandCode = "stt" | "stj" | "stx";
type MapIslandValue = IslandCode | "all";

type EstateFeatureProperties = {
  id: string;
  geoid: string;
  estateCode: string;
  baseName: string;
  fullName: string;
  county: string;
  island: IslandCode;
  quarter: string | null;
  centroid: { lat: number | null; lng: number | null };
  internalPoint: { lat: number | null; lng: number | null };
  aliases?: string[];
  searchTokens: string;
};

type EstateFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  EstateFeatureProperties
> & {
  id?: string | number;
};

type EstateCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  EstateFeatureProperties
>;

type Props = {
  selectedIsland: MapIslandValue | string;
  onChangeIsland: (value: MapIslandValue) => void;
};

const MAP_SOURCE_ID = "estates";
const MAP_FILL_LAYER_ID = "estate-fills";
const MAP_FILL_EXTRUSION_LAYER_ID = "estate-fills-extrusion";
const MAP_LINE_LAYER_ID = "estate-lines";
const MAP_SELECTED_LINE_LAYER_ID = "estate-selected-line";
const MAP_SELECTED_FILL_LAYER_ID = "estate-selected-fill";
const MAP_TERRAIN_SOURCE_ID = "mapbox-dem";

const ISLAND_VIEWS: Record<
  IslandCode,
  { center: [number, number]; zoom: number }
> = {
  stt: { center: [-64.93, 18.336], zoom: 11.8 },
  stj: { center: [-64.75, 18.34], zoom: 12.1 },
  stx: { center: [-64.74, 17.74], zoom: 10.7 },
};

const TERRITORY_VIEW = {
  center: [-64.86, 18.08] as [number, number],
  zoom: 8.6,
};

const QUARTER_COLORS: Record<string, string> = {
  "Northside A Quarter": "#F97316",
  "Northside B Quarter": "#8B5CF6",
  "Westend Quarter": "#EF4444",
  "Prince Quarter": "#10B981",
  "Queen Quarter": "#0EA5E9",
  "Queen (Dronning) Quarter": "#0EA5E9",
  "King Quarter": "#EAB308",
  "Company Quarter": "#EC4899",
  "Eastend A Quarter": "#14B8A6",
  "Eastend B Quarter": "#6366F1",

  "Little Northside Quarter": "#A855F7",
  "Southside Quarter": "#F43F5E",
  "Great Northside Quarter": "#22C55E",
  "New (Prince George) Quarter": "#38BDF8",
  "French Bay Quarter": "#F59E0B",
  "Eastend Quarter": "#D946EF",
  "Redhook Quarter": "#06B6D4",

  "Cruz Bay Quarter": "#3B82F6",
  "Maho Quarter": "#84CC16",
  "Reef Bay Quarter": "#F97316",
  "Coral Bay Quarter": "#EF4444",
  Unknown: "#64748B",
};

const ESTATE_QUARTER_OVERRIDES_BY_GEOID: Record<string, string> = {
  "7803040300": "French Bay Quarter",   // Frenchman Bay
  "7801080850": "Company Quarter",      // VI Corporation Land
};

const ESTATE_QUARTER_OVERRIDES_BY_KEY: Record<string, string> = {
  "stt:frenchman bay": "French Bay Quarter",
  "stx:vi corporation land": "Company Quarter",
};

function resolveQuarterWithOverrides(args: {
  geoid: string;
  island: IslandCode;
  baseName: string;
  fullName: string;
  aliases?: string[];
  sourceQuarter?: string | null;
}) {
  const byGeoid = ESTATE_QUARTER_OVERRIDES_BY_GEOID[args.geoid];
  if (byGeoid) return byGeoid;

  const key = `${args.island}:${normalizeEstateKey(args.baseName)}`;
  const byKey = ESTATE_QUARTER_OVERRIDES_BY_KEY[key];
  if (byKey) return byKey;

  if (args.sourceQuarter?.trim()) return args.sourceQuarter.trim();

  return resolveQuarter(
    args.island,
    args.baseName,
    args.fullName,
    args.aliases
  );
}

const MAP_ISLAND_ALIASES: Record<string, MapIslandValue> = {
  all: "all",
  "all islands": "all",
  "all-islands": "all",
  stt: "stt",
  "st. thomas": "stt",
  "st thomas": "stt",
  "saint thomas": "stt",
  stj: "stj",
  "st. john": "stj",
  "st john": "stj",
  "saint john": "stj",
  stx: "stx",
  "st. croix": "stx",
  "st croix": "stx",
  "saint croix": "stx",
};

const RAW_ISLAND_ALIASES: Record<string, IslandCode> = {
  stt: "stt",
  "st. thomas": "stt",
  "st thomas": "stt",
  "saint thomas": "stt",
  st_thomas: "stt",
  stj: "stj",
  "st. john": "stj",
  "st john": "stj",
  "saint john": "stj",
  st_john: "stj",
  stx: "stx",
  "st. croix": "stx",
  "st croix": "stx",
  "saint croix": "stx",
  st_croix: "stx",
};

function normalizeIslandCode(value: unknown): MapIslandValue {
  if (value === "all" || value === "stt" || value === "stj" || value === "stx") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return MAP_ISLAND_ALIASES[normalized] ?? "all";
  }

  return "all";
}

function normalizeRawIsland(value: unknown): IslandCode | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  return RAW_ISLAND_ALIASES[normalized] ?? null;
}

function normalizeEstateKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function compactEstateKey(value: string) {
  return normalizeEstateKey(value).replace(/\s+/g, "");
}

const DIRECTIONAL_AND_MODIFIER_REGEX = /\b(north|south|east|west|northwest|northeast|southwest|southeast|northside|southside|eastend|westend|upper|lower|great|little)\b/gi;
const ESTATE_WORD_REGEX = /(^|\s)(estate|est\.?)(?=\s|$)/gi;
const RESOLVE_CANDIDATE_CACHE = new Map<string, string[]>();

function normalizeEstateNameVariant(value: string) {
  return value.replace(ESTATE_WORD_REGEX, " ").replace(/\s+/g, " ").trim();
}

function buildQuarterCandidates(baseName: string, fullName: string, aliases?: string[]) {
  const cacheKey = `${baseName}__${fullName}__${(aliases ?? []).join("|")}`;
  const cached = RESOLVE_CANDIDATE_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const normalizedBase = normalizeEstateNameVariant(baseName);
  const normalizedFull = normalizeEstateNameVariant(fullName);

  const candidates = [
    baseName,
    fullName,
    ...(aliases ?? []),
    normalizedBase,
    normalizedFull,
    normalizedBase.replace(DIRECTIONAL_AND_MODIFIER_REGEX, "").trim(),
    normalizedFull.replace(DIRECTIONAL_AND_MODIFIER_REGEX, "").trim(),
    normalizedBase.replace(/\band\b/gi, "&"),
    normalizedFull.replace(/\band\b/gi, "&"),
    normalizedBase.replace(/&/g, "and"),
    normalizedFull.replace(/&/g, "and"),
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  RESOLVE_CANDIDATE_CACHE.set(cacheKey, candidates);
  return candidates;
}

function isEstateFeatureCandidate(
  value: GeoJSON.Feature
): value is GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  Record<string, unknown>
> {
  return Boolean(
    value?.properties && hasRenderableEstateGeometry(value.geometry)
  );
}

function estateDisplayName(properties: EstateFeatureProperties) {
  return (
    properties.baseName ||
    properties.fullName ||
    properties.estateCode ||
    properties.geoid
  );
}

function getIslandQuarterMap(island: IslandCode): IslandQuarterMap {
  if (island === "stt") return STT_ESTATE_QUARTERS;
  if (island === "stj") return STJ_ESTATE_QUARTERS;
  return STX_ESTATE_QUARTERS;
}

function buildQuarterLookup(map: IslandQuarterMap) {
  const lookup = new Map<string, string>();

  for (const [rawKey, quarter] of Object.entries(map)) {
    const normalized = normalizeEstateKey(rawKey);
    const compact = compactEstateKey(rawKey);

    if (normalized) lookup.set(normalized, quarter);
    if (compact) lookup.set(compact, quarter);
  }

  return lookup;
}

const QUARTER_LOOKUPS: Record<IslandCode, Map<string, string>> = {
  stt: buildQuarterLookup(STT_ESTATE_QUARTERS),
  stj: buildQuarterLookup(STJ_ESTATE_QUARTERS),
  stx: buildQuarterLookup(STX_ESTATE_QUARTERS),
};

function resolveQuarter(
  island: IslandCode,
  baseName: string,
  fullName: string,
  aliases?: string[]
) {
  const lookup = QUARTER_LOOKUPS[island];
  const candidates = buildQuarterCandidates(baseName, fullName, aliases);

  for (const candidate of candidates) {
    const normalized = normalizeEstateKey(candidate);
    const compact = compactEstateKey(candidate);
    const directMatch = lookup.get(normalized) ?? lookup.get(compact);
    if (directMatch) return directMatch;
  }

  return null;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildQuarterColorExpression(): mapboxgl.Expression {
  const expression: unknown[] = [
    "match",
    ["coalesce", ["get", "quarter"], "Unknown"],
  ];

  for (const [quarter, color] of Object.entries(QUARTER_COLORS)) {
    expression.push(quarter, color);
  }

  expression.push(QUARTER_COLORS.Unknown);
  return expression as mapboxgl.Expression;
}

const QUARTER_COLOR_EXPRESSION = buildQuarterColorExpression();

function getEstateBounds(feature: EstateFeature): mapboxgl.LngLatBounds | null {
  const bounds = new mapboxgl.LngLatBounds();

  if (feature.geometry.type === "Polygon") {
    for (const ring of feature.geometry.coordinates) {
      for (const [lng, lat] of ring) {
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
          bounds.extend([lng, lat]);
        }
      }
    }
  } else {
    for (const polygon of feature.geometry.coordinates) {
      for (const ring of polygon) {
        for (const [lng, lat] of ring) {
          if (Number.isFinite(lng) && Number.isFinite(lat)) {
            bounds.extend([lng, lat]);
          }
        }
      }
    }
  }

  return bounds.isEmpty() ? null : bounds;
}

function buildSearchTokens(feature: EstateFeature) {
  const props = feature.properties;
  return [
    props.baseName,
    props.fullName,
    props.geoid,
    props.estateCode,
    props.quarter ?? "",
    ...(props.aliases ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildLayerFilter(visibleIds: string[]): FilterSpecification {
  if (!visibleIds.length) {
    return ["==", ["get", "id"], "__none__"];
  }

  return ["in", ["get", "id"], ["literal", visibleIds]];
}

function buildEstateExtrusionHeightExpression(): mapboxgl.Expression {
  return [
    "+",
    120,
    ["*", ["mod", ["to-number", ["coalesce", ["get", "geoid"], "0"]], 11], 18],
  ] as mapboxgl.Expression;
}

const ESTATE_EXTRUSION_HEIGHT_EXPRESSION = buildEstateExtrusionHeightExpression();

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function EstateExplorerMap({ selectedIsland, onChangeIsland }: Props) {
  const activeIsland = normalizeIslandCode(selectedIsland);

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const hoveredEstateIdRef = useRef<string | null>(null);

  const [selectedEstate, setSelectedEstate] = useState<EstateFeature | null>(
    null
  );
  const [query, setQuery] = useState("");
  const [pickerValue, setPickerValue] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [rawEstateCollection, setRawEstateCollection] = useState<
    GeoJSON.FeatureCollection | null
  >(() => estatesGeoJson as GeoJSON.FeatureCollection);

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    let mounted = true;

    async function loadLiveEstates() {
      try {
        const res = await fetch("/api/estates", { cache: "no-store" });
        if (!res.ok) return;

        const payload = (await res.json()) as GeoJSON.FeatureCollection;
        if (!mounted) return;

        if (Array.isArray(payload.features) && payload.features.length > 0) {
          const fallback = estatesGeoJson as GeoJSON.FeatureCollection;
          const fallbackFeatures = Array.isArray(fallback.features)
            ? fallback.features
            : [];

          const liveFeatures = payload.features;

          const featureKey = (feature: GeoJSON.Feature, index: number) => {
            const props =
              typeof feature.properties === "object" && feature.properties !== null
                ? (feature.properties as Record<string, unknown>)
                : {};

            const geoid = String(props.geoid ?? "").trim();
            const id = String(props.id ?? "").trim();
            const island = String(props.island ?? "").trim().toLowerCase();
            const baseName = String(
              props.baseName ?? props.basename ?? props.name ?? ""
            )
              .trim()
              .toLowerCase();

            return geoid || id || `${island}:${baseName}` || `feature-${index}`;
          };

          const liveKeys = new Set(
            liveFeatures.map((feature, index) => featureKey(feature, index))
          );

          const missingFallbackFeatures = fallbackFeatures.filter(
            (feature, index) => !liveKeys.has(featureKey(feature, index))
          );

          setRawEstateCollection({
            type: "FeatureCollection",
            features: [...liveFeatures, ...missingFallbackFeatures],
          });
        }
      } catch {
        // Fallback to bundled data when API is unavailable.
      }
    }

    loadLiveEstates();

    return () => {
      mounted = false;
    };
  }, []);

  const estates = useMemo<EstateCollection>(() => {
    try {
      const raw =
        rawEstateCollection ?? (estatesGeoJson as GeoJSON.FeatureCollection);
      const rawFeatures = raw.features ?? [];

      const rejectedFeatures = rawFeatures.filter(
        (feature) => !isEstateFeatureCandidate(feature)
      );

      if (rejectedFeatures.length > 0) {
        console.log(
          "Rejected estate features:",
          rejectedFeatures.map((feature, index) => ({
            index,
            id: (feature.properties as Record<string, unknown> | undefined)?.id,
            geoid: (feature.properties as Record<string, unknown> | undefined)
              ?.geoid,
            baseName: (
              feature.properties as Record<string, unknown> | undefined
            )?.baseName,
            island: (feature.properties as Record<string, unknown> | undefined)
              ?.island,
            geometryType: feature.geometry?.type ?? null,
          }))
        );
      }

      const normalizedFeatures: EstateFeature[] = rawFeatures
        .filter(isEstateFeatureCandidate)
        .map((feature, index) => {
          const props = feature.properties ?? {};

          const geoid = String(props.geoid ?? "").trim();
          const rawId = String(props.id ?? "").trim();
          const id = rawId || geoid || `estate-${index}`;

          const aliases = Array.isArray(props.aliases)
            ? props.aliases.map(String)
            : undefined;

          const baseName = String(
            props.baseName ?? props.basename ?? props.name ?? props.estateName ?? ""
          ).trim();

          const fullName = String(
            props.fullName ?? props.fullname ?? (baseName ? `Estate ${baseName}` : "")
          ).trim();

          const island =
            normalizeRawIsland(props.island) ??
            normalizeRawIsland(props.county) ??
            "stt";

          const centroid =
            typeof props.centroid === "object" && props.centroid !== null
              ? (props.centroid as { lat?: unknown; lng?: unknown })
              : {};

          const internalPoint =
            typeof props.internalPoint === "object" && props.internalPoint !== null
              ? (props.internalPoint as { lat?: unknown; lng?: unknown })
              : typeof props.interiorPoint === "object" && props.interiorPoint !== null
              ? (props.interiorPoint as { lat?: unknown; lng?: unknown })
              : {};

          const sourceQuarter =
            typeof props.quarter === "string" && props.quarter.trim()
              ? props.quarter.trim()
              : null;

          return {
            type: "Feature" as const,
            id:
              typeof feature.id === "string" || typeof feature.id === "number"
                ? feature.id
                : id,
            geometry: normalizeEstateGeometry(feature.geometry),
            properties: {
              id,
              geoid,
              estateCode: String(
                props.estateCode ?? props.estatecode ?? props.code ?? ""
              ).trim(),
              baseName,
              fullName,
              county: String(props.county ?? "").trim(),
              island,
              quarter:
                sourceQuarter ?? resolveQuarter(island, baseName, fullName, aliases),
              centroid: {
                lat: toNullableNumber(centroid.lat),
                lng: toNullableNumber(centroid.lng),
              },
              internalPoint: {
                lat:
                  toNullableNumber(internalPoint.lat) ??
                  toNullableNumber(centroid.lat),
                lng:
                  toNullableNumber(internalPoint.lng) ??
                  toNullableNumber(centroid.lng),
              },
              aliases,
              searchTokens: "",
            },
          };
        });

      const idUsage = new Map<string, number>();
      const uniqueIdFeatures = normalizedFeatures.map((feature) => {
        const baseId = feature.properties.id || feature.properties.geoid;
        const seen = idUsage.get(baseId) ?? 0;
        idUsage.set(baseId, seen + 1);

        if (seen === 0) return feature;

        const uniqueId = `${baseId}__${seen + 1}`;

        return {
          ...feature,
          id: uniqueId,
          properties: {
            ...feature.properties,
            id: uniqueId,
          },
        };
      });

      const enrichedFeatures = uniqueIdFeatures.map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          searchTokens: buildSearchTokens(feature),
        },
      }));

      const unresolvedQuarterEstates = enrichedFeatures.filter(
        (feature) => !feature.properties.quarter
      );

      if (unresolvedQuarterEstates.length > 0) {
        console.log(
          "Unresolved quarter estates:",
          unresolvedQuarterEstates.map((feature) => ({
            id: feature.properties.id,
            geoid: feature.properties.geoid,
            island: feature.properties.island,
            baseName: feature.properties.baseName,
            fullName: feature.properties.fullName,
            aliases: feature.properties.aliases ?? [],
          }))
        );
      }

      const idCounts = new Map<string, number>();
      for (const feature of enrichedFeatures) {
        const nextId = feature.properties.id;
        idCounts.set(nextId, (idCounts.get(nextId) ?? 0) + 1);
      }

      const duplicateIds = [...idCounts.entries()]
        .filter(([, count]) => count > 1)
        .map(([id, count]) => ({ id, count }));

      if (duplicateIds.length > 0) {
        console.log("Duplicate estate ids:", duplicateIds);
      }

      return {
        type: "FeatureCollection",
        features: enrichedFeatures,
      };
    } catch (error) {
      console.error("Failed to normalize estate GeoJSON:", error);
      return {
        type: "FeatureCollection",
        features: [],
      };
    }
  }, [rawEstateCollection]);

  const visibleEstates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return estates.features.filter((feature) => {
      const props = feature.properties;

      if (activeIsland !== "all" && props.island !== activeIsland) {
        return false;
      }

      if (!normalizedQuery) return true;

      return feature.properties.searchTokens.includes(normalizedQuery);
    });
  }, [estates, activeIsland, query]);

  const visibleEstateIds = useMemo(
    () => visibleEstates.map((feature) => feature.properties.id),
    [visibleEstates]
  );

  const estateOptions = useMemo(() => {
    return [...visibleEstates].sort((a, b) =>
      estateDisplayName(a.properties).localeCompare(
        estateDisplayName(b.properties)
      )
    );
  }, [visibleEstates]);

  const visibleQuarterCount = useMemo(() => {
    return new Set(
      visibleEstates
        .map((feature) => feature.properties.quarter)
        .filter(Boolean)
    ).size;
  }, [visibleEstates]);

  const legendEntries = useMemo(() => {
    const visibleQuarters = new Set(
      visibleEstates
        .map((feature) => feature.properties.quarter)
        .filter(Boolean) as string[]
    );

    const entries = Object.entries(QUARTER_COLORS).filter(([quarter]) =>
      visibleQuarters.has(quarter)
    );
    const hasUnknownQuarter = visibleEstates.some(
      (feature) => !feature.properties.quarter
    );

    if (hasUnknownQuarter) {
      entries.push(["Unknown", QUARTER_COLORS.Unknown]);
    }

    return entries;
  }, [visibleEstates]);

  const selectedHistory = selectedEstate
    ? findEstateHistory(
        selectedEstate.properties.baseName,
        selectedEstate.properties.island
      )
    : null;

  const selectedEstateHref = selectedEstate
    ? `/estates/${
        selectedEstate.properties.geoid
      }?baseName=${encodeURIComponent(
        selectedEstate.properties.baseName
      )}&island=${encodeURIComponent(
        selectedEstate.properties.island
      )}&fullName=${encodeURIComponent(selectedEstate.properties.fullName)}`
    : null;

  const syncLayerFilter = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(MAP_FILL_LAYER_ID)) return;

    const filter = buildLayerFilter(visibleEstateIds);

    map.setFilter(MAP_FILL_LAYER_ID, filter);
    map.setFilter(MAP_LINE_LAYER_ID, filter);

    if (map.getLayer(MAP_SELECTED_FILL_LAYER_ID)) {
      map.setFilter(MAP_SELECTED_FILL_LAYER_ID, [
        "all",
        filter,
        ["==", ["get", "id"], selectedEstate?.properties.id ?? "__none__"],
      ]);
    }

    if (map.getLayer(MAP_SELECTED_LINE_LAYER_ID)) {
      map.setFilter(MAP_SELECTED_LINE_LAYER_ID, [
        "all",
        filter,
        ["==", ["get", "id"], selectedEstate?.properties.id ?? "__none__"],
      ]);
    }
  }, [visibleEstateIds, selectedEstate]);

  const fitVisibleEstates = useCallback(() => {
    const map = mapRef.current;
    if (!map || !visibleEstates.length || selectedEstate) return;

    const bounds = new mapboxgl.LngLatBounds();

    for (const feature of visibleEstates) {
      const featureBounds = getEstateBounds(feature);
      if (!featureBounds) continue;
      bounds.extend(featureBounds.getSouthWest());
      bounds.extend(featureBounds.getNorthEast());
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds as LngLatBoundsLike, {
        padding: 56,
        duration: 900,
        maxZoom: activeIsland === "all" ? 10.8 : 13.1,
      });
    }
  }, [visibleEstates, selectedEstate, activeIsland]);

  const focusEstate = useCallback((feature: EstateFeature) => {
    const map = mapRef.current;
    if (!map) return;

    setSelectedEstate(feature);
    setPickerValue(feature.properties.id);

    const bounds = getEstateBounds(feature);
    if (bounds) {
      map.fitBounds(bounds, {
        padding: 90,
        duration: 850,
        maxZoom: 14.4,
      });
      return;
    }

    const point = feature.properties.internalPoint;
    if (point?.lng != null && point?.lat != null) {
      map.flyTo({
        center: [point.lng, point.lat],
        zoom: Math.max(map.getZoom(), 13),
        duration: 850,
      });
    }
  }, []);

  useEffect(() => {
    if (!mapToken) return;
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = mapToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center:
        activeIsland === "all"
          ? TERRITORY_VIEW.center
          : ISLAND_VIEWS[activeIsland].center,
      zoom:
        activeIsland === "all"
          ? TERRITORY_VIEW.zoom
          : ISLAND_VIEWS[activeIsland].zoom,
      attributionControl: true,
      cooperativeGestures: true,
    });

    map.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "bottom-right"
    );

    map.on("load", () => {
      map.addSource(MAP_SOURCE_ID, {
        type: "geojson",
        promoteId: "id",
        data: {
          type: "FeatureCollection",
          features: estates.features.map((feature) => ({
            ...feature,
            id: feature.properties.id,
          })),
        },
      });

      map.addLayer({
        id: MAP_FILL_LAYER_ID,
        type: "fill",
        source: MAP_SOURCE_ID,
        paint: {
          "fill-color": QUARTER_COLOR_EXPRESSION,
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.48,
            0.36,
          ],
        },
      });

      map.addLayer({
        id: MAP_FILL_EXTRUSION_LAYER_ID,
        type: "fill-extrusion",
        source: MAP_SOURCE_ID,
        layout: {
          visibility: "none",
        },
        paint: {
          "fill-extrusion-color": QUARTER_COLOR_EXPRESSION,
          "fill-extrusion-height": ESTATE_EXTRUSION_HEIGHT_EXPRESSION,
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.82,
        },
      });

      map.addLayer({
        id: MAP_LINE_LAYER_ID,
        type: "line",
        source: MAP_SOURCE_ID,
        paint: {
          "line-color": "rgba(15, 23, 42, 0.52)",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            2,
            1.15,
          ],
          "line-opacity": 0.92,
        },
      });

      map.addSource(MAP_TERRAIN_SOURCE_ID, {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });

      map.addLayer({
        id: MAP_SELECTED_FILL_LAYER_ID,
        type: "fill",
        source: MAP_SOURCE_ID,
        filter: ["==", ["get", "id"], "__none__"],
        paint: {
          "fill-color": "#ffffff",
          "fill-opacity": 0.18,
        },
      });

      map.addLayer({
        id: MAP_SELECTED_LINE_LAYER_ID,
        type: "line",
        source: MAP_SOURCE_ID,
        filter: ["==", ["get", "id"], "__none__"],
        paint: {
          "line-color": "#0f172a",
          "line-width": 3.25,
          "line-opacity": 1,
        },
      });

      if (!isTouchDevice()) {
        map.on("mousemove", MAP_FILL_LAYER_ID, (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0] as unknown as
            | EstateFeature
            | undefined;
          if (!feature?.properties?.id) return;

          map.getCanvas().style.cursor = "pointer";

          const previousId = hoveredEstateIdRef.current;
          if (previousId && previousId !== feature.properties.id) {
            map.setFeatureState(
              { source: MAP_SOURCE_ID, id: previousId },
              { hover: false }
            );
          }

          hoveredEstateIdRef.current = feature.properties.id;

          map.setFeatureState(
            { source: MAP_SOURCE_ID, id: feature.properties.id },
            { hover: true }
          );
        });

        map.on("mouseleave", MAP_FILL_LAYER_ID, () => {
          map.getCanvas().style.cursor = "";

          const hoveredId = hoveredEstateIdRef.current;
          if (hoveredId) {
            map.setFeatureState(
              { source: MAP_SOURCE_ID, id: hoveredId },
              { hover: false }
            );
          }

          hoveredEstateIdRef.current = null;
        });
      }

      map.on("click", MAP_FILL_LAYER_ID, (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as unknown as
          | EstateFeature
          | undefined;
        if (!feature?.properties?.id) return;
        focusEstate(feature);
      });

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      hoveredEstateIdRef.current = null;
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [mapToken, estates.features, activeIsland, focusEstate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource(MAP_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: estates.features.map((feature) => ({
          ...feature,
          id: feature.properties.id,
        })),
      });
    }
  }, [estates, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    syncLayerFilter();
  }, [mapReady, syncLayerFilter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const is3d = viewMode === "3d";

    if (map.getLayer(MAP_FILL_LAYER_ID)) {
      map.setLayoutProperty(
        MAP_FILL_LAYER_ID,
        "visibility",
        is3d ? "none" : "visible"
      );
    }

    if (map.getLayer(MAP_FILL_EXTRUSION_LAYER_ID)) {
      map.setLayoutProperty(
        MAP_FILL_EXTRUSION_LAYER_ID,
        "visibility",
        is3d ? "visible" : "none"
      );
      map.setFilter(MAP_FILL_EXTRUSION_LAYER_ID, buildLayerFilter(visibleEstateIds));
    }

    if (is3d) {
      map.setTerrain({ source: MAP_TERRAIN_SOURCE_ID, exaggeration: 1.18 });
      map.easeTo({
        pitch: 56,
        bearing: -18,
        duration: 700,
      });
      return;
    }

    map.setTerrain(null);
    map.easeTo({
      pitch: 0,
      bearing: 0,
      duration: 600,
    });
  }, [mapReady, viewMode, visibleEstateIds]);

  useEffect(() => {
    fitVisibleEstates();
  }, [fitVisibleEstates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const selectedId = selectedEstate?.properties.id ?? "__none__";
    const visibleFilter = buildLayerFilter(visibleEstateIds);

    if (map.getLayer(MAP_SELECTED_FILL_LAYER_ID)) {
      map.setFilter(MAP_SELECTED_FILL_LAYER_ID, [
        "all",
        visibleFilter,
        ["==", ["get", "id"], selectedId],
      ]);
    }

    if (map.getLayer(MAP_SELECTED_LINE_LAYER_ID)) {
      map.setFilter(MAP_SELECTED_LINE_LAYER_ID, [
        "all",
        visibleFilter,
        ["==", ["get", "id"], selectedId],
      ]);
    }
  }, [selectedEstate, mapReady, visibleEstateIds]);

  useEffect(() => {
    if (selectedEstate?.properties?.id) {
      setPickerValue(selectedEstate.properties.id);
    }
  }, [selectedEstate]);

  useEffect(() => {
    setSelectedEstate(null);
    setPickerValue("");
  }, [activeIsland]);

  useEffect(() => {
    if (!estates.features.length) {
      setLoadError("No estate features were loaded from the GeoJSON file.");
      return;
    }
    setLoadError(null);
  }, [estates]);

  if (!mapToken) {
    return (
      <div className="rounded-[32px] border border-rose-200 bg-rose-50 p-6">
        <div className="text-lg font-black text-slate-900">
          Map token missing
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Add <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> to your environment.
        </p>
      </div>
    );
  }

  const islandLabel =
    activeIsland === "all"
      ? "Territory view"
      : activeIsland === "stt"
      ? "St. Thomas"
      : activeIsland === "stj"
      ? "St. John"
      : "St. Croix";

  return (
    <div className="grid gap-6 xl:grid-cols-[410px_minmax(0,1fr)]">
      <aside className="relative overflow-hidden rounded-[34px] border border-sky-100/70 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f2fbff_46%,#e8f8f3_100%)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="text-[11px] font-black uppercase tracking-[0.26em] text-sky-700">
          Estate explorer
        </div>

        <h1 className="mt-3 text-[2rem] font-black leading-[1.02] tracking-tight text-slate-950">
          Explore official estate geography
        </h1>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          Browse historic estate boundaries with quarter-based color mapping,
          direct selection, and a cleaner territorial reading of each island.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {(
            [
              ["all", "All Islands"],
              ["stt", "St. Thomas"],
              ["stj", "St. John"],
              ["stx", "St. Croix"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onChangeIsland(value)}
              className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition ${
                activeIsland === value
                  ? "bg-[linear-gradient(135deg,#0ea5e9,#14b8a6)] text-white shadow-[0_8px_30px_rgba(14,165,233,0.28)]"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          {(["2d", "3d"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition ${
                viewMode === mode
                  ? "bg-slate-900 text-white shadow-[0_8px_24px_rgba(15,23,42,0.25)]"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {mode === "2d" ? "2D map" : "3D terrain"}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          <FieldLabel label="Search estate" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedEstate(null);
              setPickerValue("");
            }}
            placeholder="Search by name, code, GEOID, or quarter"
            className="h-13 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-900 outline-none ring-0 transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
          />
        </div>

        <div className="mt-4 space-y-4">
          <FieldLabel label="Estate picker" />
          <select
            value={pickerValue}
            onChange={(e) => {
              const nextId = e.target.value;
              setPickerValue(nextId);

              if (!nextId) {
                setSelectedEstate(null);
                return;
              }

              const nextEstate =
                estateOptions.find(
                  (feature) => feature.properties.id === nextId
                ) ?? null;

              if (nextEstate) {
                focusEstate(nextEstate);
              }
            }}
            className="h-13 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400"
          >
            <option value="">Choose an estate</option>
            {estateOptions.map((feature) => (
              <option key={feature.properties.id} value={feature.properties.id}>
                {estateDisplayName(feature.properties)}
                {feature.properties.quarter
                  ? ` — ${feature.properties.quarter}`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
            Visible estates
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white px-3 py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Visible
              </div>
              <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                {visibleEstates.length}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white px-3 py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Quarters
              </div>
              <div className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                {visibleQuarterCount}
              </div>
            </div>
          </div>
          <div className="mt-3 grid gap-1 text-xs text-slate-500">
            <div>Active island: {islandLabel}</div>
            <div>Total loaded estates: {estates.features.length}</div>
          </div>
        </div>

        <div className="mt-5 rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
            Quarter legend
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {legendEntries.map(([quarter, color]) => (
              <span
                key={quarter}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: color }}
                />
                {quarter}
              </span>
            ))}
          </div>
        </div>

        {loadError ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        ) : null}

        {selectedEstate ? (
          <div className="mt-5 rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Selected estate
            </div>

            <div className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              {estateDisplayName(selectedEstate.properties)}
            </div>

            <div className="mt-1 text-sm font-semibold text-slate-600">
              {selectedEstate.properties.fullName}
            </div>

            <div className="mt-4 grid gap-3">
              <InfoRow
                label="Island"
                value={selectedEstate.properties.island.toUpperCase()}
              />
              <InfoRow
                label="Quarter"
                value={selectedEstate.properties.quarter || "Unknown"}
              />
              <InfoRow
                label="Estate code"
                value={selectedEstate.properties.estateCode || "—"}
              />
              <InfoRow label="GEOID" value={selectedEstate.properties.geoid} />
              <InfoRow
                label="Internal point"
                value={
                  typeof selectedEstate.properties.internalPoint?.lat ===
                    "number" &&
                  typeof selectedEstate.properties.internalPoint?.lng ===
                    "number"
                    ? `${selectedEstate.properties.internalPoint.lat.toFixed(
                        5
                      )}, ${selectedEstate.properties.internalPoint.lng.toFixed(
                        5
                      )}`
                    : typeof selectedEstate.properties.centroid?.lat ===
                        "number" &&
                      typeof selectedEstate.properties.centroid?.lng ===
                        "number"
                    ? `${selectedEstate.properties.centroid.lat.toFixed(
                        5
                      )}, ${selectedEstate.properties.centroid.lng.toFixed(5)}`
                    : "—"
                }
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {selectedEstateHref ? (
                <Link
                  href={selectedEstateHref}
                  className="rounded-full bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-[0_8px_26px_rgba(29,78,216,0.35)] transition hover:brightness-110"
                >
                  Open estate page
                </Link>
              ) : null}

              <button
                type="button"
                onClick={() => focusEstate(selectedEstate)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-900 transition hover:border-sky-200 hover:bg-sky-50"
              >
                Focus on map
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
            <div className="text-sm leading-7 text-slate-600">
              Choose an estate or tap a polygon to inspect it.
            </div>
          </div>
        )}

        {selectedHistory ? (
          <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Historical profile
            </div>

            {selectedHistory.quarter ? (
              <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Quarter
                </div>
                <div className="mt-1 text-sm font-black text-slate-900">
                  {selectedHistory.quarter}
                </div>
              </div>
            ) : null}

            <p className="mt-3 text-sm leading-7 text-slate-600">
              {selectedHistory.historicalSummary}
            </p>

            {selectedHistory.topographicNotes ? (
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {selectedHistory.topographicNotes}
              </p>
            ) : null}

            {selectedHistory.cartographicNotes ? (
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {selectedHistory.cartographicNotes}
              </p>
            ) : null}

            {selectedHistory.aliases?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedHistory.aliases.map((alias) => (
                  <span
                    key={alias}
                    className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700"
                  >
                    {alias}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Sources: {selectedHistory.sources.join(" · ")}
            </div>
          </div>
        ) : null}
      </aside>

      <section className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.16)]">
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
              Polygon map
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Quarter colors stay constant. Selection sits on top.
            </div>
          </div>

          <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-sky-700 shadow-sm">
            {islandLabel}
          </div>
        </div>

        <div className="relative h-[820px] w-full">
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                "linear-gradient(180deg, rgba(56,189,248,0.12) 0%, rgba(255,255,255,0.00) 24%, rgba(16,185,129,0.08) 100%)",
            }}
          />

          <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-2xl border border-white/70 bg-white/78 px-4 py-3 shadow-[0_14px_36px_rgba(15,23,42,0.14)] backdrop-blur">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Live map mode
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              Estate quarter view
            </div>
          </div>

          <div ref={mapContainerRef} className="h-full w-full" />
        </div>
      </section>
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
      {label}
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-slate-900">{value}</div>
    </div>
  );
}
