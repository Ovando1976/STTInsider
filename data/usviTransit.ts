export type Coordinates = {
  lat: number;
  lng: number;
};

export type LocationType =
  | "airport"
  | "ferry"
  | "beach"
  | "town"
  | "hotel"
  | "marina"
  | "other";

export type LocationDetail = {
  island: "St. Thomas" | "St. John" | "St. Croix";
  type: LocationType;
  description?: string;
};

export type ServiceAlert = {
  id: string;
  island: "St. Thomas" | "St. John" | "St. Croix";
  severity: "low" | "medium" | "high";
  title: string;
  impact: string;
};

export type TransferPlan = {
  mode: "ferry" | "seaplane" | "flight";
  from: string;
  to: string;
  durationMinutes: number;
  cadence: string;
};

export const locationCoords: Record<string, Coordinates> = {
  "Cyril E. King Airport (STT)": { lat: 18.3373, lng: -64.9734 },
  "Red Hook Ferry Terminal": { lat: 18.3244, lng: -64.8513 },
  "Charlotte Amalie": { lat: 18.3419, lng: -64.9307 },
  "Cruz Bay Ferry Dock": { lat: 18.3319, lng: -64.7936 },
  "Henry E. Rohlsen Airport (STX)": { lat: 17.7019, lng: -64.7986 },
  Christiansted: { lat: 17.7465, lng: -64.7032 },
};

export const locationDetails: Record<string, LocationDetail> = {
  "Cyril E. King Airport (STT)": { island: "St. Thomas", type: "airport" },
  "Red Hook Ferry Terminal": { island: "St. Thomas", type: "ferry" },
  "Charlotte Amalie": { island: "St. Thomas", type: "town" },
  "Cruz Bay Ferry Dock": { island: "St. John", type: "ferry" },
  "Henry E. Rohlsen Airport (STX)": { island: "St. Croix", type: "airport" },
  Christiansted: { island: "St. Croix", type: "town" },
};

export const serviceAlerts: ServiceAlert[] = [
  {
    id: "stt-1",
    island: "St. Thomas",
    severity: "medium",
    title: "Airport congestion",
    impact: "Pickup times around STT may be delayed during arrival peaks.",
  },
  {
    id: "stj-1",
    island: "St. John",
    severity: "low",
    title: "Ferry queue advisory",
    impact: "Expect moderate lines at Cruz Bay during late afternoon.",
  },
];

export function planInterIslandTransfer(
  pickup: string,
  dropoff: string
): TransferPlan | null {
  const from = locationDetails[pickup];
  const to = locationDetails[dropoff];

  if (!from || !to) return null;
  if (from.island === to.island) return null;

  if (
    (from.island === "St. Thomas" && to.island === "St. John") ||
    (from.island === "St. John" && to.island === "St. Thomas")
  ) {
    return {
      mode: "ferry",
      from:
        from.island === "St. Thomas"
          ? "Red Hook Ferry Terminal"
          : "Cruz Bay Ferry Dock",
      to:
        from.island === "St. Thomas"
          ? "Cruz Bay Ferry Dock"
          : "Red Hook Ferry Terminal",
      durationMinutes: 20,
      cadence: "Every 30-60 minutes",
    };
  }

  return {
    mode: "flight",
    from: pickup,
    to: dropoff,
    durationMinutes: 35,
    cadence: "Scheduled service required",
  };
}
