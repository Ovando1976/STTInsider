export type BookingStatus =
  | "pending"
  | "confirmed"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type BookingLocation = {
  label: string;
  addressText: string | null;
  lat: number;
  lng: number;
  estateGeoid: string | null;
  estateName: string | null;
  islandCode: "STT" | "STJ" | "STX" | "WAT" | "UNK";
  zoneType: string;
};

export type BookingPricing = {
  baseFare: number;
  distanceFare: number;
  zoneAdjustment: number;
  surgeMultiplier: number;
  totalEstimate: number;
  currency: "USD";
};

export type BookingRouteMeta = {
  sameEstate: boolean;
  sameIsland: boolean;
  estimatedDistanceMiles: number;
  routeClass: string;
  matchedRouteLabel?: string | null;
};

export type RideBooking = {
  id: string;
  status: BookingStatus;
  customer: {
    fullName: string;
    phone: string;
    email: string | null;
  };
  trip: {
    pickupTime: string;
    riders: number;
    rideType: "standard" | "xl" | "premium";
    paymentMethod: "visa" | "mastercard" | "applepay";
    tipPercent: number;
    promoCode: string | null;
    preferences: {
      quietRide: boolean;
      extraLuggage: boolean;
      accessibility: boolean;
    };
  };
  pickup: BookingLocation;
  dropoff: BookingLocation;
  pricing: BookingPricing;
  routeMeta: BookingRouteMeta;
  source: "web";
  createdAt: string;
  updatedAt: string;
};
