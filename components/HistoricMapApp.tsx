"use client";

import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";
import { useMemo, useState } from "react";

type HistoricSite = {
  name: string;
  island: "St. Thomas" | "St. John" | "St. Croix";
  era: string;
  description: string;
  position: {
    lat: number;
    lng: number;
  };
};

type IslandFilter = "All" | "St. Thomas" | "St. John" | "St. Croix";
type MapView = "roadmap" | "satellite";

export const historicSites: HistoricSite[] = [
  {
    name: "Fort Christian",
    island: "St. Thomas",
    era: "17th century",
    description:
      "Oldest standing structure in the USVI with Danish colonial history.",
    position: { lat: 18.3419, lng: -64.9307 },
  },
  {
    name: "Estate Whim Plantation",
    island: "St. Croix",
    era: "18th century",
    description: "Restored sugar plantation with museum exhibits and gardens.",
    position: { lat: 17.6995, lng: -64.8513 },
  },
  {
    name: "Cruz Bay Historic District",
    island: "St. John",
    era: "19th century",
    description:
      "Harborfront district with historic streets and landmark buildings.",
    position: { lat: 18.334, lng: -64.7927 },
  },
];

const islandFilters: IslandFilter[] = [
  "All",
  "St. Thomas",
  "St. John",
  "St. Croix",
];

function HistoricMapApp() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });

  const [query, setQuery] = useState<string>("");
  const [activeIsland, setActiveIsland] = useState<IslandFilter>("All");
  const [selectedSite, setSelectedSite] = useState<HistoricSite | null>(
    historicSites[0]
  );
  const [mapType, setMapType] = useState<MapView>("roadmap");

  const filteredSites = historicSites.filter((site) => {
    const q = query.toLowerCase();
    const matchesQuery =
      site.name.toLowerCase().includes(q) ||
      site.description.toLowerCase().includes(q);

    const matchesIsland =
      activeIsland === "All" || site.island === activeIsland;

    return matchesQuery && matchesIsland;
  });

  const center = useMemo(() => {
    if (selectedSite) return selectedSite.position;
    return filteredSites[0]?.position ?? historicSites[0].position;
  }, [filteredSites, selectedSite]);

  const activeSite = selectedSite ?? filteredSites[0] ?? historicSites[0];

  return (
    <div className="App">
      <section className="page-card">
        <div className="map-header">
          <div>
            <h2 className="section-title">Historic Map</h2>
            <p>
              Explore historic landmarks by island and learn key highlights.
            </p>
          </div>

          <div className="map-toggle">
            <span>Map view</span>
            <button
              type="button"
              className={mapType === "roadmap" ? "active" : ""}
              onClick={() => setMapType("roadmap")}
            >
              Map
            </button>
            <button
              type="button"
              className={mapType === "satellite" ? "active" : ""}
              onClick={() => setMapType("satellite")}
            >
              Satellite
            </button>
          </div>
        </div>

        <div className="map-controls">
          <input
            className="map-search"
            type="text"
            placeholder="Search sites or stories"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="map-filters">
            {islandFilters.map((island) => (
              <button
                key={island}
                type="button"
                className={`map-filter${activeIsland === island ? " active" : ""}`}
                onClick={() => setActiveIsland(island)}
              >
                {island}
              </button>
            ))}
          </div>
        </div>

        <div className="map-layout">
          <div className="map-list">
            {filteredSites.length === 0 ? (
              <p>No sites found. Try a different search.</p>
            ) : (
              filteredSites.map((site) => (
                <button
                  key={site.name}
                  type="button"
                  className={`map-list-item${
                    selectedSite?.name === site.name ? " active" : ""
                  }`}
                  onClick={() => setSelectedSite(site)}
                >
                  <div>
                    <strong>{site.name}</strong>
                    <p>
                      {site.island} • {site.era}
                    </p>
                  </div>
                </button>
              ))
            )}

            {activeSite && (
              <div className="map-detail-card">
                <h3>{activeSite.name}</h3>
                <p className="map-detail-meta">
                  {activeSite.island} • {activeSite.era}
                </p>
                <p>{activeSite.description}</p>
                <div className="map-detail-actions">
                  <button type="button">Save</button>
                  <button type="button">Share</button>
                </div>
              </div>
            )}
          </div>

          <div className="map-panel">
            {!isLoaded ? (
              <p>🧭 Loading map...</p>
            ) : (
              <GoogleMap
                mapContainerStyle={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "12px",
                }}
                center={center}
                zoom={10}
                options={{
                  mapTypeId: mapType,
                  fullscreenControl: false,
                  streetViewControl: false,
                }}
              >
                {filteredSites.map((site) => (
                  <Marker
                    key={site.name}
                    position={site.position}
                    title={site.name}
                    onClick={() => setSelectedSite(site)}
                  />
                ))}

                {activeSite && (
                  <InfoWindow
                    position={activeSite.position}
                    onCloseClick={() => setSelectedSite(null)}
                  >
                    <div className="map-info-window">
                      <strong>{activeSite.name}</strong>
                      <p>
                        {activeSite.island} • {activeSite.era}
                      </p>
                      <p>{activeSite.description}</p>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default HistoricMapApp;