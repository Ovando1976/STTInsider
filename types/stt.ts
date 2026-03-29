export type BusinessCategory =
  | "Beach"
  | "Food"
  | "Shopping"
  | "Activity"
  | "Stay";

export type BeachContent = {
  type: "Beach";
  amenities: string[];
  fee?: string;
};

export type MenuItem = {
  n: string;
  p: string;
};

export type MenuSection = {
  name: string;
  items: MenuItem[];
};

export type MenuContent = {
  type: "Menu";
  categories: MenuSection[];
};

export type ShopContent = {
  type: "Shop";
  products: string[];
};

export type RichContent = BeachContent | MenuContent | ShopContent;

export type Business = {
  id: string;
  name: string;
  category: BusinessCategory;
  image?: string;
  featured?: boolean;
  rating?: number;
  openTime?: number;
  closeTime?: number;
  lat: number;
  lng: number;
  location: string;
  description: string;
  island?: string;
  reserve?: string;
  pickup?: string;
  richContent?: RichContent;
};

export interface Review {
  id: string;
  businessId: string;
  userName: string;
  score: number;
  text: string;
  timestamp: number;
}

export type Checkin = {
  id: string;
  businessId: string;
  timestamp: number;
  photoUrl?: string;
};

export interface WeatherDay {
  label: string;
  icon: string;
  high: number;
}

export type RideLocationContext = {
  label: string;
  addressText: string | null;
  lat: number;
  lng: number;
  estateGeoid: string | null;
  estateName: string | null;
  islandCode: "STT" | "STJ" | "STX" | "WAT" | "UNK";
  zoneType:
    | "estate"
    | "airport"
    | "ferry"
    | "hotel"
    | "beach"
    | "marina"
    | "downtown"
    | "custom";
};

export type RideRequest = {
  id: string;
  riderId: string;
  status:
    | "draft"
    | "requested"
    | "matched"
    | "driver_en_route"
    | "in_progress"
    | "completed"
    | "cancelled";
  pickup: RideLocationContext;
  dropoff: RideLocationContext;
  pricing: {
    baseFare: number;
    distanceFare: number;
    zoneAdjustment: number;
    surgeMultiplier: number;
    totalEstimate: number;
    currency: "USD";
  };
  routeMeta: {
    sameEstate: boolean;
    sameIsland: boolean;
    routeClass:
      | "local"
      | "town"
      | "airport"
      | "ferry"
      | "tourist_corridor"
      | "cross_island"
      | "interzone";
  };
  createdAt: string;
  updatedAt: string;
};
