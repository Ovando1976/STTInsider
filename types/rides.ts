export type IslandCode = "STT" | "STJ" | "STX" | "WAT" | "UNK";

export type RideZoneType =
  | "estate"
  | "airport"
  | "ferry"
  | "hotel"
  | "beach"
  | "marina"
  | "downtown"
  | "custom";

export type RideStatus =
  | "draft"
  | "requested"
  | "matched"
  | "driver_en_route"
  | "in_progress"
  | "completed"
  | "cancelled";

export type RideRouteClass =
  | "local"
  | "town"
  | "airport"
  | "ferry"
  | "tourist_corridor"
  | "cross_island"
  | "interzone";

export type RideLocationContext = {
  label: string;
  addressText: string | null;
  lat: number;
  lng: number;
  estateGeoid: string | null;
  estateName: string | null;
  islandCode: IslandCode;
  zoneType: RideZoneType;
};

export type RidePricing = {
  baseFare: number;
  distanceFare: number;
  zoneAdjustment: number;
  surgeMultiplier: number;
  totalEstimate: number;
  currency: "USD";
};

export type RideRouteMeta = {
  sameEstate: boolean;
  sameIsland: boolean;
  estimatedDistanceMiles: number;
  routeClass: RideRouteClass;
};

export type RideEstimate = {
  pickup: RideLocationContext;
  dropoff: RideLocationContext;
  pricing: RidePricing;
  routeMeta: RideRouteMeta;
};

export type RideRequest = {
  id: string;
  riderId: string;
  status: RideStatus;
  pickup: RideLocationContext;
  dropoff: RideLocationContext;
  pricing: RidePricing;
  routeMeta: RideRouteMeta;
  createdAt: string;
  updatedAt: string;
};
