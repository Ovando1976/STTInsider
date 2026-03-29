"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type LayerProps,
  type LngLatBoundsLike,
  type MapRef,
  type ViewState,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

type Coordinates = {
  lat: number;
  lng: number;
};

type NearbyPlace = {
  id: string;
  name: string;
  island?: string;
  kind?: string;
  routeLabel?: string;
  coordinates: Coordinates;
};

type FireLocation = {
  id: string;
  name: string;
  island: string;
  kind: string;
  routeLabel: string;
  aliases: string[];
  coordinates?: Coordinates;
  routingCoordinates?: Coordinates;
  isActive: boolean;
  sortOrder?: number;
};

type RoutePreviewMapProps = {
  pickupCoords: Coordinates;
  dropoffCoords: Coordinates;
  pickupLabel?: string;
  dropoffLabel?: string;
  pickupEstate?: string | null;
  dropoffEstate?: string | null;
  nearbyPlaces?: NearbyPlace[];
};

type DirectionsGeometry = {
  coordinates: [number, number][];
  type: "LineString";
};

type DirectionsRoute = {
  distance: number;
  duration: number;
  geometry: DirectionsGeometry;
};

type DirectionsResponse = {
  routes?: DirectionsRoute[];
};

type FeaturePoint = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    kind: "pickup" | "dropoff" | "midpoint";
  };
};

const roadRouteLayer: LayerProps = {
  id: "road-route-line",
  type: "line",
  paint: {
    "line-width": 6,
    "line-opacity": 0.92,
    "line-color": "#0ea5e9",
  },
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
};

const fallbackRouteLayer: LayerProps = {
  id: "fallback-route-line",
  type: "line",
  paint: {
    "line-width": 4,
    "line-opacity": 0.55,
    "line-color": "#64748b",
    "line-dasharray": [2, 2],
  },
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
};

const pointHaloLayer: LayerProps = {
  id: "context-point-halos",
  type: "circle",
  paint: {
    "circle-radius": [
      "match",
      ["get", "kind"],
      "pickup",
      18,
      "dropoff",
      18,
      "midpoint",
      12,
      10,
    ] as const,
    "circle-color": [
      "match",
      ["get", "kind"],
      "pickup",
      "#0ea5e9",
      "dropoff",
      "#10b981",
      "midpoint",
      "#334155",
      "#64748b",
    ] as const,
    "circle-opacity": 0.12,
  },
};

const pointCoreLayer: LayerProps = {
  id: "context-point-cores",
  type: "circle",
  paint: {
    "circle-radius": [
      "match",
      ["get", "kind"],
      "pickup",
      6,
      "dropoff",
      6,
      "midpoint",
      4,
      4,
    ] as const,
    "circle-color": [
      "match",
      ["get", "kind"],
      "pickup",
      "#0ea5e9",
      "dropoff",
      "#10b981",
      "midpoint",
      "#334155",
      "#64748b",
    ] as const,
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
  },
};

function formatMiles(meters: number) {
  return `${(meters / 1609.344).toFixed(1)} mi`;
}

function formatMinutes(seconds: number) {
  return `${Math.round(seconds / 60)} min`;
}

function prettyCoord(value: number) {
  return value.toFixed(5);
}

function haversineMiles(a: Coordinates, b: Coordinates) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

function midpoint(a: Coordinates, b: Coordinates): Coordinates {
  return {
    lat: (a.lat + b.lat) / 2,
    lng: (a.lng + b.lng) / 2,
  };
}

function kindChip(kind?: string) {
  const text = String(kind ?? "").toLowerCase();

  if (text.includes("airport")) return "Airport";
  if (text.includes("ferry")) return "Ferry";
  if (text.includes("beach")) return "Beach";
  if (text.includes("hotel")) return "Hotel";
  if (text.includes("town")) return "Town";
  if (text.includes("neighborhood")) return "Neighborhood";
  return kind || "Place";
}

function getNearbyMarkerClass(kind?: string) {
  const text = String(kind ?? "").toLowerCase();

  if (text.includes("airport")) {
    return "bg-sky-600";
  }
  if (text.includes("ferry")) {
    return "bg-cyan-600";
  }
  if (text.includes("beach")) {
    return "bg-amber-500";
  }
  if (text.includes("hotel")) {
    return "bg-violet-600";
  }
  if (text.includes("town")) {
    return "bg-emerald-600";
  }
  if (text.includes("landmark")) {
    return "bg-orange-500";
  }

  return "bg-slate-600";
}

export default function RoutePreviewMap({
  pickupCoords,
  dropoffCoords,
  pickupLabel = "Pickup",
  dropoffLabel = "Dropoff",
  pickupEstate,
  dropoffEstate,
  nearbyPlaces = [],
}: RoutePreviewMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef | null>(null);

  const [route, setRoute] = useState<DirectionsRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  const [pickupPopupOpen, setPickupPopupOpen] = useState(false);
  const [dropoffPopupOpen, setDropoffPopupOpen] = useState(false);
  const [midpointPopupOpen, setMidpointPopupOpen] = useState(false);
  const [selectedNearby, setSelectedNearby] = useState<NearbyPlace | null>(
    null
  );

  const midpointCoords = useMemo(
    () => midpoint(pickupCoords, dropoffCoords),
    [pickupCoords, dropoffCoords]
  );

  const straightLineMiles = useMemo(
    () => haversineMiles(pickupCoords, dropoffCoords),
    [pickupCoords, dropoffCoords]
  );

  const filteredNearbyPlaces = useMemo(() => {
    return nearbyPlaces
      .map((place) => ({
        ...place,
        distanceToRouteCenter: haversineMiles(
          midpointCoords,
          place.coordinates
        ),
      }))
      .filter((place) => place.distanceToRouteCenter <= 6)
      .sort((a, b) => a.distanceToRouteCenter - b.distanceToRouteCenter)
      .slice(0, 12);
  }, [nearbyPlaces, midpointCoords]);

  const bounds = useMemo<LngLatBoundsLike>(() => {
    const lngs = [
      pickupCoords.lng,
      dropoffCoords.lng,
      ...filteredNearbyPlaces.map((place) => place.coordinates.lng),
    ];
    const lats = [
      pickupCoords.lat,
      dropoffCoords.lat,
      ...filteredNearbyPlaces.map((place) => place.coordinates.lat),
    ];

    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];
  }, [pickupCoords, dropoffCoords, filteredNearbyPlaces]);

  const initialViewState = useMemo<ViewState>(
    () => ({
      longitude: (pickupCoords.lng + dropoffCoords.lng) / 2,
      latitude: (pickupCoords.lat + dropoffCoords.lat) / 2,
      zoom: 11,
      bearing: 0,
      pitch: 0,
      padding: { top: 48, bottom: 48, left: 48, right: 48 },
    }),
    [pickupCoords, dropoffCoords]
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchRoute() {
      if (!token) return;

      setLoading(true);
      setRouteError("");

      try {
        const url =
          `https://api.mapbox.com/directions/v5/mapbox/driving/` +
          `${pickupCoords.lng},${pickupCoords.lat};${dropoffCoords.lng},${dropoffCoords.lat}` +
          `?geometries=geojson` +
          `&overview=full` +
          `&steps=false` +
          `&approaches=curb;curb` +
          `&access_token=${token}`;

        const response = await fetch(url);

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Directions failed: ${response.status} ${text}`);
        }

        const data = (await response.json()) as DirectionsResponse;
        const nextRoute = data.routes?.[0] ?? null;

        if (!cancelled) {
          setRoute(nextRoute);
          if (!nextRoute) {
            setRouteError("Road route unavailable. Showing direct path.");
          }
        }
      } catch (error) {
        console.error("Mapbox directions failed", error);
        if (!cancelled) {
          setRoute(null);
          setRouteError("Unable to load road route. Showing direct path.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRoute();

    return () => {
      cancelled = true;
    };
  }, [pickupCoords, dropoffCoords, token]);

  useEffect(() => {
    if (!mapRef.current) return;

    const timer = window.setTimeout(() => {
      mapRef.current?.fitBounds(bounds, {
        padding: 64,
        duration: 900,
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [bounds, route]);

  const roadRouteGeoJson = useMemo(() => {
    if (!route?.geometry) return null;

    return {
      type: "Feature" as const,
      properties: {},
      geometry: route.geometry,
    };
  }, [route]);

  const fallbackRouteGeoJson = useMemo(() => {
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [pickupCoords.lng, pickupCoords.lat],
          [dropoffCoords.lng, dropoffCoords.lat],
        ],
      },
    };
  }, [pickupCoords, dropoffCoords]);

  const pointFeatures = useMemo(() => {
    const features: FeaturePoint[] = [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [pickupCoords.lng, pickupCoords.lat],
        },
        properties: { kind: "pickup" },
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [dropoffCoords.lng, dropoffCoords.lat],
        },
        properties: { kind: "dropoff" },
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [midpointCoords.lng, midpointCoords.lat],
        },
        properties: { kind: "midpoint" },
      },
    ];

    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [pickupCoords, dropoffCoords, midpointCoords]);

  if (!token) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
        <div className="text-sm font-black text-slate-900">Route Preview</div>
        <p className="mt-2 text-sm text-slate-600">
          Missing <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>.
        </p>
      </div>
    );
  }

  const displayedDistance = route
    ? formatMiles(route.distance)
    : `${straightLineMiles.toFixed(1)} mi`;

  const displayedDuration = route
    ? formatMinutes(route.duration)
    : `${Math.max(4, Math.round((straightLineMiles / 22) * 60))} min`;

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="text-sm font-black text-slate-900">Route Preview</div>
          <div className="text-xs text-slate-500">
            Route + nearby places from your location data
          </div>
        </div>
        <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
          {route ? "Road route" : "Direct path"}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="h-[420px] w-full">
          <Map
            ref={mapRef}
            mapboxAccessToken={token}
            initialViewState={initialViewState}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            reuseMaps
            attributionControl
          >
            <NavigationControl position="top-right" />

            <Source
              id="route-fallback-source"
              type="geojson"
              data={fallbackRouteGeoJson}
            >
              <Layer {...fallbackRouteLayer} />
            </Source>

            {roadRouteGeoJson ? (
              <Source
                id="route-road-source"
                type="geojson"
                data={roadRouteGeoJson}
              >
                <Layer {...roadRouteLayer} />
              </Source>
            ) : null}

            <Source
              id="route-points-source"
              type="geojson"
              data={pointFeatures}
            >
              <Layer {...pointHaloLayer} />
              <Layer {...pointCoreLayer} />
            </Source>

            <Marker
              longitude={pickupCoords.lng}
              latitude={pickupCoords.lat}
              anchor="bottom"
            >
              <button
                type="button"
                onClick={() => setPickupPopupOpen((v) => !v)}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-sky-500 shadow-lg"
                aria-label="Pickup marker"
              >
                <span className="h-2 w-2 rounded-full bg-white" />
              </button>
            </Marker>

            <Marker
              longitude={dropoffCoords.lng}
              latitude={dropoffCoords.lat}
              anchor="bottom"
            >
              <button
                type="button"
                onClick={() => setDropoffPopupOpen((v) => !v)}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-lg"
                aria-label="Dropoff marker"
              >
                <span className="h-2 w-2 rounded-full bg-white" />
              </button>
            </Marker>

            <Marker
              longitude={midpointCoords.lng}
              latitude={midpointCoords.lat}
              anchor="center"
            >
              <button
                type="button"
                onClick={() => setMidpointPopupOpen((v) => !v)}
                className="flex h-4 w-4 items-center justify-center rounded-full border border-white bg-slate-700 shadow"
                aria-label="Midpoint marker"
              />
            </Marker>

            {filteredNearbyPlaces.map((place) => (
              <Marker
                key={place.id}
                longitude={place.coordinates.lng}
                latitude={place.coordinates.lat}
                anchor="center"
              >
                <button
                  type="button"
                  onClick={() => setSelectedNearby(place)}
                  className="flex h-4 w-4 items-center justify-center rounded-full border border-white bg-amber-500 shadow"
                  aria-label={place.name}
                />
              </Marker>
            ))}

            {pickupPopupOpen ? (
              <Popup
                longitude={pickupCoords.lng}
                latitude={pickupCoords.lat}
                anchor="top"
                onClose={() => setPickupPopupOpen(false)}
                closeOnClick={false}
              >
                <div className="min-w-[180px]">
                  <div className="font-semibold text-slate-900">
                    {pickupLabel}
                  </div>
                  <div className="text-xs text-slate-600">
                    {pickupEstate ?? "Estate pending"}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {prettyCoord(pickupCoords.lat)},{" "}
                    {prettyCoord(pickupCoords.lng)}
                  </div>
                </div>
              </Popup>
            ) : null}

            {dropoffPopupOpen ? (
              <Popup
                longitude={dropoffCoords.lng}
                latitude={dropoffCoords.lat}
                anchor="top"
                onClose={() => setDropoffPopupOpen(false)}
                closeOnClick={false}
              >
                <div className="min-w-[180px]">
                  <div className="font-semibold text-slate-900">
                    {dropoffLabel}
                  </div>
                  <div className="text-xs text-slate-600">
                    {dropoffEstate ?? "Estate pending"}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {prettyCoord(dropoffCoords.lat)},{" "}
                    {prettyCoord(dropoffCoords.lng)}
                  </div>
                </div>
              </Popup>
            ) : null}

            {midpointPopupOpen ? (
              <Popup
                longitude={midpointCoords.lng}
                latitude={midpointCoords.lat}
                anchor="top"
                onClose={() => setMidpointPopupOpen(false)}
                closeOnClick={false}
              >
                <div className="min-w-[180px]">
                  <div className="font-semibold text-slate-900">
                    Route midpoint
                  </div>
                  <div className="text-xs text-slate-600">
                    Nearby context center
                  </div>
                </div>
              </Popup>
            ) : null}

            {selectedNearby ? (
              <Popup
                longitude={selectedNearby.coordinates.lng}
                latitude={selectedNearby.coordinates.lat}
                anchor="top"
                onClose={() => setSelectedNearby(null)}
                closeOnClick={false}
              >
                <div className="min-w-[190px]">
                  <div className="font-semibold text-slate-900">
                    {selectedNearby.name}
                  </div>
                  <div className="text-xs text-slate-600">
                    {kindChip(selectedNearby.kind)}
                    {selectedNearby.island ? ` · ${selectedNearby.island}` : ""}
                  </div>
                  {selectedNearby.routeLabel ? (
                    <div className="mt-1 text-[11px] text-slate-500">
                      {selectedNearby.routeLabel}
                    </div>
                  ) : null}
                </div>
              </Popup>
            ) : null}
          </Map>
        </div>

        <div className="border-t border-slate-200 bg-slate-50/60 lg:border-l lg:border-t-0">
          <div className="border-b border-slate-200 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Route intelligence
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  Distance
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {loading ? "Calculating..." : displayedDistance}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  Time
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {loading ? "Calculating..." : displayedDuration}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-3 col-span-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  Pickup
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {pickupEstate ?? pickupLabel}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-3 col-span-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  Dropoff
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {dropoffEstate ?? dropoffLabel}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Nearby places on this route
            </div>

            {filteredNearbyPlaces.length === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">
                No nearby places found from current location data.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNearbyPlaces.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => {
                      setSelectedNearby(place);
                      mapRef.current?.flyTo({
                        center: [place.coordinates.lng, place.coordinates.lat],
                        zoom: 13.5,
                        duration: 700,
                      });
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {place.name}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {kindChip(place.kind)}
                          {place.island ? ` · ${place.island}` : ""}
                        </div>
                      </div>
                      <div className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                        {place.distanceToRouteCenter.toFixed(1)} mi
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {routeError ? (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {routeError}
        </div>
      ) : null}
    </div>
  );
}
