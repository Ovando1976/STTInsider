export type DistrictCode = "stt_stj" | "stx";

export type IslandCode = "stt" | "stj" | "stx";

export type QuarterCode =
  // St. Thomas
  | "westend"
  | "southside"
  | "great_northside"
  | "little_northside"
  | "new_prince_george"
  | "french_bay"
  | "eastend"
  | "redhook"
  | "water_island"
  // St. John
  | "cruz_bay"
  | "maho"
  | "reef_bay"
  | "coral_bay"
  | "stj_eastend"
  // St. Croix
  | "northside_a"
  | "northside_b"
  | "prince"
  | "queen_dronning"
  | "king"
  | "company"
  | "eastend_a"
  | "eastend_b"
  | "stx_westend";

export type CommunityPostType =
  | "pulse"
  | "ferry"
  | "beach"
  | "nightlife"
  | "food"
  | "event"
  | "tip"
  | "community";

export type CommunityPost = {
  id: string;
  title: string;
  body: string;

  type: CommunityPostType;

  district: DistrictCode;
  island: IslandCode;
  quarter: QuarterCode;

  estateGeoid?: string | null;
  estateName?: string | null;
  placeName?: string | null;

  authorName: string;
  authorHandle?: string | null;

  verified?: boolean;
  tags?: string[];
  likes: number;
  replies: number;
  createdAt: number;
};
export type CommunityIsland =
  | "St. Thomas"
  | "St. John"
  | "St. Croix"
  | "Water Island";

export type CommunityZone =
  | "all"
  | "town"
  | "havensight"
  | "crown_bay"
  | "east_end"
  | "northside"
  | "mid_island"
  | "southside"
  | "water_island";

export type CommunityContext = {
  cruisePulse: string;
  ferryWatch: string;
  marineNote: string;
  seasonalNote: string;
};
