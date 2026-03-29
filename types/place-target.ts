export type PlaceTargetType =
  | "business"
  | "estate"
  | "event"
  | "beach"
  | "restaurant"
  | "shop"
  | "poi"
  | "custom";

export type PlaceTarget = {
  id: string;
  type: PlaceTargetType;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  island?: "St. Thomas" | "St. John" | "St. Croix" | "Water Island";
  estateGeoid?: string | null;
  estateName?: string | null;
  locationLabel?: string;
  businessId?: string;
  lat?: number | null;
  lng?: number | null;
  tags?: string[];
};
