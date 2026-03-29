export type UnifiedPlaceKind =
  | "business"
  | "estate"
  | "event"
  | "location"
  | "community";

export type UnifiedIsland =
  | "St. Thomas"
  | "St. John"
  | "St. Croix"
  | "Water Island";

  export type UnifiedCategory =
  | "All"
  | "Beach"
  | "Food"
  | "Shopping"
  | "Activity"
  | "Stay"
  | "Community";

export type UnifiedPlaceSource =
  | "discovery"
  | "community"
  | "passport"
  | "concierge"
  | "transit"
  | "system";

export type UnifiedPlace = {
  id: string;
  kind: UnifiedPlaceKind;
  source: UnifiedPlaceSource;

  title: string;
  subtitle?: string;
  description?: string;
  image?: string | null;

  island?: UnifiedIsland;
  category?: UnifiedCategory;

  businessId?: string;
  eventId?: string;
  locationId?: string;

  estateGeoid?: string | null;
  estateName?: string | null;

  routeLabel?: string;
  locationLabel?: string;

  lat?: number | null;
  lng?: number | null;

  tags?: string[];
};

export type RideDraft = {
  pickup?: {
    label: string;
    lat?: number | null;
    lng?: number | null;
    estateGeoid?: string | null;
    estateName?: string | null;
  } | null;
  dropoff?: {
    label: string;
    lat?: number | null;
    lng?: number | null;
    estateGeoid?: string | null;
    estateName?: string | null;
  } | null;
};

export type ConciergeDraft = {
  prompt?: string;
  place?: UnifiedPlace | null;
};

export type SearchState = {
  query: string;
  island:
    | "All Islands"
    | "St. Thomas"
    | "St. John"
    | "St. Croix"
    | "Water Island";
  category: "All" | "Beach" | "Food" | "Shopping" | "Activity" | "Stay";
  bookmarkOnly: boolean;
  distanceSort: boolean;
};

export type SttAppTab =
  | "places"
  | "beaches"
  | "restaurants"
  | "shops"
  | "community"
  | "concierge"
  | "transit"
  | "passport";