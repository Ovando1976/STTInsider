"use client";

import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export type IslandCode = "stt" | "stj" | "stx";

export type DiscoveryPlace = {
  id: string;
  name: string;
  island: IslandCode;
  category: "beach" | "food" | "shopping" | "activity" | "stay";
  lat: number;
  lng: number;
  description?: string;
};

type Props = {
  places: DiscoveryPlace[];
  selectedPlaceId: string | null;
  onSelectPlace: (id: string) => void;
};

const DEFAULT_CENTER: [number, number] = [-64.93, 18.34];
const DEFAULT_ZOOM = 9;

export function SttDiscoveryMap({
  places,
  selectedPlaceId,
  onSelectPlace,
}: Props) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const bounds = useMemo(() => {
    if (!places.length) return null;

    const nextBounds = new mapboxgl.LngLatBounds();
    for (const place of places) {
      nextBounds.extend([place.lng, place.lat]);
    }
    return nextBounds;
  }, [places]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapToken) return;

    mapboxgl.accessToken = mapToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [mapToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    for (const place of places) {
      const el = document.createElement("button");
      el.type = "button";
      el.className =
        "h-4 w-4 rounded-full border-2 border-white shadow-[0_0_0_3px_rgba(255,255,255,0.15)]";
      el.style.backgroundColor =
        place.id === selectedPlaceId
          ? "#f59e0b"
          : getCategoryColor(place.category);
      el.style.cursor = "pointer";

      el.addEventListener("click", () => onSelectPlace(place.id));

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([place.lng, place.lat])
        .addTo(map);

      markersRef.current.push(marker);
    }

    if (bounds && !bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: 60,
        maxZoom: 13,
        duration: 900,
      });
    }
  }, [places, selectedPlaceId, onSelectPlace, bounds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPlaceId) return;

    const selected = places.find((place) => place.id === selectedPlaceId);
    if (!selected) return;

    map.flyTo({
      center: [selected.lng, selected.lat],
      zoom: Math.max(map.getZoom(), 12),
      duration: 900,
    });
  }, [selectedPlaceId, places]);

  if (!mapToken) {
    return (
      <div className="flex h-[720px] items-center justify-center rounded-[28px] border border-rose-500/30 bg-rose-500/10 p-6 text-center">
        <div>
          <div className="text-lg font-black text-white">Missing map token</div>
          <div className="mt-2 text-sm font-semibold text-rose-100/80">
            Add NEXT_PUBLIC_MAPBOX_TOKEN to your environment variables.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
      <div ref={mapContainerRef} className="h-[720px] w-full" />
    </div>
  );
}

function getCategoryColor(
  category: "beach" | "food" | "shopping" | "activity" | "stay"
) {
  switch (category) {
    case "beach":
      return "#0ea5e9";
    case "food":
      return "#ef4444";
    case "shopping":
      return "#8b5cf6";
    case "activity":
      return "#14b8a6";
    case "stay":
      return "#f59e0b";
    default:
      return "#94a3b8";
  }
}
