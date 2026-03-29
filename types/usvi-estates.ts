export type UsviEstate = {
    geoid: string;
    name: string;
    basename: string;
    state: string;
    county: string;
    island: "St. Thomas" | "St. John" | "St. Croix" | "Water Island";
    centroid: {
      lat: number;
      lng: number;
    };
    interiorPoint: {
      lat: number;
      lng: number;
    };
  };