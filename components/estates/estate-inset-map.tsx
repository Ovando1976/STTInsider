"use client";

import { useEffect, useMemo, useRef } from "react";
import mapboxgl, { type GeoJSONSource } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import estatesGeoJson from "@/data/usvi-estates-firestore.json";
import {
  hasRenderableEstateGeometry,
  normalizeEstateGeometry,
} from "@/lib/usvi/estate-geometry";

type IslandCode = "stt" | "stj" | "stx";

type EstateFeatureProperties = {
  id: string;
  geoid: string;
  estateCode: string;
  baseName: string;
  fullName: string;
  county: string;
  island: IslandCode;
  quarter?: string | null;
  centroid?: { lat: number | null; lng: number | null };
  internalPoint?: { lat: number | null; lng: number | null };
  aliases?: string[];
};

type EstateFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  EstateFeatureProperties
> & {
  id?: string | number;
};

const ESTATE_SOURCE_ID = "estate-inset-source";
const ESTATE_FILL_ID = "estate-inset-fill";
const ESTATE_LINE_ID = "estate-inset-line";

function isEstateFeature(value: GeoJSON.Feature): value is EstateFeature {
  return Boolean(
    value?.properties &&
      hasRenderableEstateGeometry(value.geometry) &&
      typeof value.properties.geoid === "string"
  );
}

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

export function EstateInsetMap({
  geoid,
  title,
}: {
  geoid: string;
  title?: string;
}) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const feature = useMemo(() => {
    const raw = estatesGeoJson as GeoJSON.FeatureCollection;
    const match =
      (raw.features ?? [])
        .filter(isEstateFeature)
        .find(
          (item) =>
            String(item.properties.geoid).trim() === String(geoid).trim()
        ) ?? null;

    if (!match) return null;

    return {
      ...match,
      geometry: normalizeEstateGeometry(match.geometry),
      id:
        typeof match.id === "string" || typeof match.id === "number"
          ? match.id
          : match.properties.id,
    } as EstateFeature;
  }, [geoid]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !mapToken || !feature)
      return;

    mapboxgl.accessToken = mapToken;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/navigation-day-v1",
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
      touchZoomRotate: true,
    });

    map.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: false,
        showCompass: false,
      }),
      "bottom-right"
    );

    map.on("load", () => {
      map.addSource(ESTATE_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              ...feature,
              id: feature.properties.id,
            },
          ],
        },
        promoteId: "id",
      });

      map.addLayer({
        id: ESTATE_FILL_ID,
        type: "fill",
        source: ESTATE_SOURCE_ID,
        paint: {
          "fill-color": "#0ea5e9",
          "fill-opacity": 0.18,
        },
      });

      map.addLayer({
        id: ESTATE_LINE_ID,
        type: "line",
        source: ESTATE_SOURCE_ID,
        paint: {
          "line-color": "#0f172a",
          "line-width": 3,
          "line-opacity": 0.95,
        },
      });

      const bounds = getEstateBounds(feature);

      if (bounds) {
        map.fitBounds(bounds, {
          padding: 36,
          duration: 0,
          maxZoom: 15.5,
        });
      } else if (
        feature.properties.internalPoint?.lng != null &&
        feature.properties.internalPoint?.lat != null
      ) {
        map.jumpTo({
          center: [
            feature.properties.internalPoint.lng,
            feature.properties.internalPoint.lat,
          ],
          zoom: 14,
        });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [feature, mapToken]);

  if (!mapToken) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Missing <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>.
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        No mapped estate polygon was found for GEOID {geoid}.
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">
            Estate inset
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-700">
            {title || feature.properties.fullName}
          </div>
        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
          Roads + boundary
        </div>
      </div>

      <div className="relative h-[360px] w-full">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </section>
  );
}
