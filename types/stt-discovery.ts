export type DiscoveryIslandCode = "stt" | "stj" | "stx";

export type DiscoveryPlace = {
  id: string;
  name: string;
  island: DiscoveryIslandCode;
  category: "beach" | "food" | "shopping" | "activity" | "stay";
  lat: number;
  lng: number;
  description?: string;
};
