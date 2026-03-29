import type { DistrictCode, IslandCode, QuarterCode } from "@/types/community";

export const DISTRICTS: Record<
  DistrictCode,
  {
    label: string;
    islands: IslandCode[];
  }
> = {
  stt_stj: {
    label: "St. Thomas–St. John District",
    islands: ["stt", "stj"],
  },
  stx: {
    label: "St. Croix District",
    islands: ["stx"],
  },
};

export const ISLANDS: Record<
  IslandCode,
  {
    label: string;
    district: DistrictCode;
  }
> = {
  stt: {
    label: "St. Thomas",
    district: "stt_stj",
  },
  stj: {
    label: "St. John",
    district: "stt_stj",
  },
  stx: {
    label: "St. Croix",
    district: "stx",
  },
};

export const QUARTERS: Record<
  QuarterCode,
  {
    label: string;
    island: IslandCode;
    district: DistrictCode;
  }
> = {
  westend: {
    label: "Westend Quarter",
    island: "stt",
    district: "stt_stj",
  },
  southside: {
    label: "Southside Quarter",
    island: "stt",
    district: "stt_stj",
  },
  great_northside: {
    label: "Great Northside Quarter",
    island: "stt",
    district: "stt_stj",
  },
  little_northside: {
    label: "Little Northside Quarter",
    island: "stt",
    district: "stt_stj",
  },
  new_prince_george: {
    label: "New (Prince George) Quarter",
    island: "stt",
    district: "stt_stj",
  },
  french_bay: {
    label: "French Bay Quarter",
    island: "stt",
    district: "stt_stj",
  },
  eastend: {
    label: "Eastend Quarter",
    island: "stt",
    district: "stt_stj",
  },
  redhook: {
    label: "Redhook Quarter",
    island: "stt",
    district: "stt_stj",
  },
  water_island: {
    label: "Water Island Quarter",
    island: "stt",
    district: "stt_stj",
  },

  cruz_bay: {
    label: "Cruz Bay Quarter",
    island: "stj",
    district: "stt_stj",
  },
  maho: {
    label: "Maho Quarter",
    island: "stj",
    district: "stt_stj",
  },
  reef_bay: {
    label: "Reef Bay Quarter",
    island: "stj",
    district: "stt_stj",
  },
  coral_bay: {
    label: "Coral Bay Quarter",
    island: "stj",
    district: "stt_stj",
  },
  stj_eastend: {
    label: "Eastend Quarter",
    island: "stj",
    district: "stt_stj",
  },

  northside_a: {
    label: "Northside A Quarter",
    island: "stx",
    district: "stx",
  },
  northside_b: {
    label: "Northside B Quarter",
    island: "stx",
    district: "stx",
  },
  stx_westend: {
    label: "Westend Quarter",
    island: "stx",
    district: "stx",
  },
  prince: {
    label: "Prince Quarter",
    island: "stx",
    district: "stx",
  },
  queen_dronning: {
    label: "Queen (Dronning) Quarter",
    island: "stx",
    district: "stx",
  },
  king: {
    label: "King Quarter",
    island: "stx",
    district: "stx",
  },
  company: {
    label: "Company Quarter",
    island: "stx",
    district: "stx",
  },
  eastend_a: {
    label: "Eastend A Quarter",
    island: "stx",
    district: "stx",
  },
  eastend_b: {
    label: "Eastend B Quarter",
    island: "stx",
    district: "stx",
  },
};

export function districtLabel(district: DistrictCode) {
  return DISTRICTS[district]?.label ?? "Virgin Islands District";
}

export function islandLabel(island: IslandCode) {
  return ISLANDS[island]?.label ?? "Virgin Islands";
}

export function quarterLabel(quarter: QuarterCode) {
  return QUARTERS[quarter]?.label ?? "Quarter";
}
