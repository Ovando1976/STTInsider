export type GazetteerPlace = {
  id: string;
  canonicalName: string;
  featureType:
    | "estate"
    | "bay"
    | "harbor"
    | "point"
    | "hill"
    | "town"
    | "island"
    | "cove"
    | "lagoon"
    | "quarter"
    | "other";
  island?: "St. Thomas" | "St. John" | "St. Croix" | "Water Island";
  aliases: string[];
  description?: string;
  estateName?: string | null;
  lat?: number | null;
  lng?: number | null;
  source: "Geographic Dictionary of the Virgin Islands";
  sourcePage?: number;
};
