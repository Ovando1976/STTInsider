import {
  STJ_ESTATE_QUARTERS,
  STT_ESTATE_QUARTERS,
  STX_ESTATE_QUARTERS,
  type IslandQuarterMap,
} from "@/lib/usvi/estate-quarters";

export type EstateHistoryRecord = {
  slug: string;
  geoid?: string;
  baseName: string;
  fullName?: string;
  island: "stt" | "stj" | "stx";
  quarter?: string;
  aliases?: string[];
  historicalSummary: string;
  cartographicNotes?: string;
  tenureNotes?: string;
  topographicNotes?: string;
  sources: string[];
};

function normalizeEstateKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function compactEstateKey(value: string): string {
  return normalizeEstateKey(value).replace(/\s+/g, "");
}

function normalizeIslandCode(value: unknown): "stt" | "stj" | "stx" | null {
  if (value === "stt" || value === "stj" || value === "stx") return value;
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();

  if (
    normalized === "stt" ||
    normalized === "st thomas" ||
    normalized === "st. thomas" ||
    normalized === "saint thomas" ||
    normalized === "st_thomas"
  ) {
    return "stt";
  }

  if (
    normalized === "stj" ||
    normalized === "st john" ||
    normalized === "st. john" ||
    normalized === "saint john" ||
    normalized === "st_john"
  ) {
    return "stj";
  }

  if (
    normalized === "stx" ||
    normalized === "st croix" ||
    normalized === "st. croix" ||
    normalized === "saint croix" ||
    normalized === "st_croix"
  ) {
    return "stx";
  }

  return null;
}

function getQuarterMap(island: "stt" | "stj" | "stx"): IslandQuarterMap {
  if (island === "stt") return STT_ESTATE_QUARTERS;
  if (island === "stj") return STJ_ESTATE_QUARTERS;
  return STX_ESTATE_QUARTERS;
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return Array.from(
    new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))
  );
}

function inferQuarter(
  estateName: string,
  islandInput: unknown,
  aliases?: string[],
  geoid?: string
): string | undefined {
  const island = normalizeIslandCode(islandInput);
  if (!island) return undefined;

  if (geoid && ESTATE_QUARTER_OVERRIDES_BY_GEOID[geoid]) {
    return ESTATE_QUARTER_OVERRIDES_BY_GEOID[geoid];
  }

  const overrideKey = `${island}:${normalizeEstateKey(estateName)}`;
  if (ESTATE_QUARTER_OVERRIDES_BY_KEY[overrideKey]) {
    return ESTATE_QUARTER_OVERRIDES_BY_KEY[overrideKey];
  }

  const lookup = new Map<string, string>();

  for (const [rawKey, quarter] of Object.entries(getQuarterMap(island))) {
    const normalized = normalizeEstateKey(rawKey);
    const compact = compactEstateKey(rawKey);

    if (normalized) lookup.set(normalized, quarter);
    if (compact) lookup.set(compact, quarter);
  }

  const candidates = [
    estateName,
    ...(aliases ?? []),
    estateName.replace(/^estate\s+/i, ""),
    estateName.replace(/\b(north|south|east|west)\b/gi, "").trim(),
    estateName.replace(/\band\b/gi, "&"),
    estateName.replace(/&/g, "and"),
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeEstateKey(candidate);
    const compact = compactEstateKey(candidate);
    const direct = lookup.get(normalized) ?? lookup.get(compact);
    if (direct) return direct;
  }

  return undefined;
}

function scoreRecord(record: EstateHistoryRecord) {
  let score = 0;
  if (record.geoid) score += 10;
  if (record.fullName) score += 4;
  if (record.quarter) score += 3;
  if (record.aliases?.length) score += Math.min(record.aliases.length, 6);
  if (record.cartographicNotes) score += 2;
  if (record.tenureNotes) score += 2;
  if (record.topographicNotes) score += 2;
  if (record.historicalSummary)
    score += Math.min(record.historicalSummary.length / 120, 5);
  if (record.sources?.length) score += Math.min(record.sources.length, 4);
  return score;
}

function patchAliases(record: EstateHistoryRecord): string[] {
  const aliases = [...(record.aliases ?? [])];

  const island = record.island;
  const base = normalizeEstateKey(record.baseName);

  if (island === "stt" && base === "tutu") {
    aliases.push(
      "Anna's Retreat",
      "Annas Retreat",
      "Anna S Retreat",
      "Anna S. Retreat"
    );
  }

  if (island === "stt" && base === "water island") {
    aliases.push("Waterisland");
  }

  if (island === "stj" && base === "klein caneel") {
    aliases.push("Klein Caneel Estate");
  }

  if (island === "stj" && base === "maho bay") {
    aliases.push("Mahobay");
  }

  if (island === "stx" && base === "hard labor") {
    aliases.push("Hardlabor");
  }

  if (island === "stx" && base === "morningstar") {
    aliases.push("Morning Star", "Morning_Star");
  }

  if (island === "stx" && base === "great pond") {
    aliases.push("Greatpond");
  }

  if (island === "stx" && base === "mount pleasant") {
    aliases.push("Colquohoun Mt Pleasant");
  }

  return uniqueStrings(aliases);
}

function buildRawDedupKey(record: EstateHistoryRecord) {
  const island = record.island;
  const nameKey = normalizeEstateKey(record.baseName);
  const quarterKey = normalizeEstateKey(
    record.quarter ??
      inferQuarter(record.baseName, record.island, record.aliases) ??
      ""
  );

  return `${island}:${nameKey}:${quarterKey}`;
}

function mergeDuplicateRawRecords(
  left: EstateHistoryRecord,
  right: EstateHistoryRecord
): EstateHistoryRecord {
  const preferred = scoreRecord(right) > scoreRecord(left) ? right : left;
  const secondary = preferred === left ? right : left;

  const aliases = uniqueStrings([
    ...patchAliases(preferred),
    ...patchAliases(secondary),
    preferred.baseName,
    secondary.baseName,
    preferred.fullName,
    secondary.fullName,
  ]).filter(
    (value) =>
      normalizeEstateKey(value) !== normalizeEstateKey(preferred.baseName)
  );

  const quarter =
    preferred.quarter ??
    secondary.quarter ??
    inferQuarter(preferred.baseName, preferred.island, aliases);

  return {
    slug: preferred.slug,
    geoid: preferred.geoid ?? secondary.geoid,
    baseName: preferred.baseName,
    fullName:
      preferred.fullName ??
      secondary.fullName ??
      `Estate ${preferred.baseName}`,
    island: preferred.island,
    quarter,
    aliases: aliases.length ? aliases : undefined,
    historicalSummary:
      preferred.historicalSummary.length >= secondary.historicalSummary.length
        ? preferred.historicalSummary
        : secondary.historicalSummary,
    cartographicNotes:
      preferred.cartographicNotes ?? secondary.cartographicNotes,
    tenureNotes: preferred.tenureNotes ?? secondary.tenureNotes,
    topographicNotes: preferred.topographicNotes ?? secondary.topographicNotes,
    sources: uniqueStrings([
      ...(preferred.sources ?? []),
      ...(secondary.sources ?? []),
    ]),
  };
}

function dedupeRawEstateHistory(
  records: EstateHistoryRecord[]
): EstateHistoryRecord[] {
  const merged = new Map<string, EstateHistoryRecord>();

  for (const raw of records) {
    const record: EstateHistoryRecord = {
      ...raw,
      aliases: patchAliases(raw),
      quarter:
        raw.quarter ?? inferQuarter(raw.baseName, raw.island, raw.aliases),
      fullName: raw.fullName ?? `Estate ${raw.baseName}`,
    };

    const key = buildRawDedupKey(record);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, record);
      continue;
    }

    merged.set(key, mergeDuplicateRawRecords(existing, record));
  }

  return Array.from(merged.values()).sort((a, b) => {
    if (a.island !== b.island) return a.island.localeCompare(b.island);
    const quarterA = a.quarter ?? "";
    const quarterB = b.quarter ?? "";
    if (quarterA !== quarterB) return quarterA.localeCompare(quarterB);
    return a.baseName.localeCompare(b.baseName);
  });
}

function buildEstateHistory(
  records: EstateHistoryRecord[]
): EstateHistoryRecord[] {
  const merged = new Map<string, EstateHistoryRecord>();

  for (const record of records) {
    const quarter =
      record.quarter ??
      inferQuarter(record.baseName, record.island, record.aliases);

    const key = `${record.island}:${normalizeEstateKey(
      record.baseName
    )}:${normalizeEstateKey(quarter ?? "")}`;

    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...record,
        fullName: record.fullName ?? `Estate ${record.baseName}`,
        quarter,
      });
      continue;
    }

    merged.set(key, mergeDuplicateRawRecords(existing, record));
  }

  return Array.from(merged.values());
}

function matchRecordByName(
  record: EstateHistoryRecord,
  target: string
): boolean {
  const names = [record.baseName, ...(record.aliases ?? []), record.fullName]
    .filter(Boolean)
    .map(normalizeEstateKey);

  const compactNames = [
    record.baseName,
    ...(record.aliases ?? []),
    record.fullName,
  ]
    .filter(Boolean)
    .map(compactEstateKey);

  return (
    names.includes(target) || compactNames.includes(target.replace(/\s+/g, ""))
  );
}

const ESTATE_QUARTER_OVERRIDES_BY_GEOID: Record<string, string> = {
  "7803040300": "French Bay Quarter",
  "7801080850": "Company Quarter",
};

const ESTATE_QUARTER_OVERRIDES_BY_KEY: Record<string, string> = {
  "stt:frenchman bay": "French Bay Quarter",
  "stx:vi corporation land": "Company Quarter",
};

const RAW_ESTATE_HISTORY: EstateHistoryRecord[] = [
  {
    slug: "adelphi-stt",
    geoid: "7803000030",
    baseName: "Adelphi",
    fullName: "Estate Adelphi",
    island: "stt",
    quarter: "Southside Quarter",
    historicalSummary:
      "Adelphi Estate is situated where the shore road ascends a spur of Hawk Hill, overlooking a little bay roughly 350 yards wide.",
    topographicNotes:
      "The estate occupies a dramatic slope above Brewers Bay terrain, where the road climbs onto a spur and opens toward the coast.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "adventure-stx",
    baseName: "Adventure",
    fullName: "Estate Adventure",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Adventure Estate is traversed by Adventure Gut and backed by a sheer 220-foot rise called Adventure Hill, whose flat summit was surmounted by the estate’s mill.",
    topographicNotes:
      "The estate combines gut drainage, a steep interior rise, and an elevated mill position overlooking the tract.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "annaberg-stx",
    baseName: "Annaberg",
    fullName: "Estate Annaberg and Shannon Grove",
    island: "stx",
    quarter: "King Quarter",
    aliases: ["Annaberg and Shannon Grove"],
    historicalSummary:
      "Annaberg on St. Croix occupies tracts near Krause Lagoon and includes two hills rising above 100 feet, the higher being Annaberg Hill at 117 feet.",
    topographicNotes:
      "Its landscape is defined by low coastal relief, lagoon adjacency, and modest hills embedded within estate ground.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "annaly-stx",
    geoid: "7801003630",
    baseName: "Annaly",
    fullName: "Estate Annaly",
    island: "stx",
    quarter: "Northside A Quarter",
    historicalSummary:
      "Annaly Estate features an extensive settlement at the source of a gut between Annaly Hill and Oxford Hill, positioned at the junction of five roads.",
    topographicNotes:
      "Annaly Hill rises to about 702 feet, making the estate one of the stronger upland and route-junction landscapes on St. Croix.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "beck-grove-stx",
    baseName: "Beck Grove",
    fullName: "Estate Becks Grove",
    island: "stx",
    quarter: "Westend Quarter",
    aliases: ["Becks Grove"],
    historicalSummary:
      "Beck Grove Estate features an estate house situated in Cane Valley, with a spring uphill from the house and wild guavas throughout the property.",
    topographicNotes:
      "The estate sits in a valley environment supported by spring water and surrounding slopes.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "bellevue-stx",
    geoid: "7801006260",
    baseName: "Bellevue",
    fullName: "Estate Bellevue",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Bellevue Estate had its mill near the summit of Bellevue Hill, while the estate house stood lower down at roughly 220 feet elevation.",
    topographicNotes:
      "The estate reflects the classic plantation arrangement of hillside mill placement above the main residential and working structures.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "bethlehem-stx",
    baseName: "Bethlehem",
    fullName: "Estate Bethlehem",
    island: "stx",
    quarter: "King Quarter",
    historicalSummary:
      "Bethlehem Estate was a massive tract of more than 1,100 acres, crossed by Bethlehem and Fairplain Creeks as well as the Centerline and Southside Roads.",
    topographicNotes:
      "Its geography is structured by interior drainage, major road corridors, and wide agricultural acreage.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "canaan-stt",
    geoid: "7803011650",
    baseName: "Canaan",
    fullName: "Estate Canaan and Sherpenjewel",
    island: "stt",
    quarter: "Great Northside Quarter",
    historicalSummary:
      "Canaan Estate on St. Thomas sits on a 410-foot bench along a hill spur southeast of Magens Bay.",
    topographicNotes:
      "The estate occupies elevated northside terrain with a commanding hillside position above the bay system.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "canaan-stx",
    geoid: "7801011525",
    baseName: "Canaan",
    fullName: "Estate Canaan",
    island: "stx",
    quarter: "Northside B Quarter",
    historicalSummary:
      "Canaan Estate on St. Croix occupies a small valley planted in cane at the head stream of Concordia Gut, inland from the north coast.",
    topographicNotes:
      "The estate is defined by headwater terrain, enclosed valley relief, and cane-suitable ground.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "carolina-stj",
    geoid: "7802013650",
    baseName: "Carolina",
    fullName: "Estate Carolina",
    island: "stj",
    quarter: "Coral Bay Quarter",
    historicalSummary:
      "Carolina Estate was a prosperous property on a 181-foot hill northwest of Coral Harbor, known for stock farming, bananas, and a bay-oil still.",
    topographicNotes:
      "Its elevated position above Coral Bay gave it both agricultural utility and visual command over the harbor side.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "castle-burke-stx",
    baseName: "Castle Burke",
    fullName: "Estate Castle Burke",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Castle Burke Estate had its estate house built on a 102-foot hill southwest of Bethlehem.",
    topographicNotes:
      "The site used a modest rise for the main estate seat in otherwise broad plantation country.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "clairmont-stx",
    baseName: "Clairmont",
    fullName: "Estate Clairmont",
    island: "stx",
    quarter: "Northside B Quarter",
    historicalSummary:
      "Clairmont Estate featured an estate house on a hill south of Baron Bluff and a mill on a northwest spur at high elevation.",
    topographicNotes:
      "The estate is strongly associated with steep upland terrain, bluff edges, and ridge-spur mill placement.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "concordia-stx",
    geoid: "7801024410",
    baseName: "Concordia",
    fullName: "Estate Concordia",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Concordia Estate on St. Croix featured a grassy hill in its northeast quarter, with buildings and a mill located on a lower rise that sloped toward the coast.",
    topographicNotes:
      "The estate combined interior hill ground with gentler descending land nearer the shoreline.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "contant-stt",
    geoid: "7803026310",
    baseName: "Contant",
    fullName: "Estate Contant",
    island: "stt",
    quarter: "Westend Quarter",
    historicalSummary:
      "Contant Estate on St. Thomas featured a stone mill on a ridge northwest of Gregerie Bay.",
    topographicNotes:
      "Its defining geography is ridge-top industrial placement above the bay and town hinterland.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "diamond-stx",
    baseName: "Diamond",
    fullName: "Estate Diamond",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Diamond Estate had its village, great house, and mill centrally positioned on a 100-foot swell east of St. George Bek and the Southside Road.",
    topographicNotes:
      "The estate used a low central rise as the organizing point for its built core.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "enfield-green-stx",
    baseName: "Enfield Green",
    fullName: "Estate Enfield Green",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Enfield Green comprised extensive cane land with a mill on a low knoll near the south shore.",
    topographicNotes:
      "Its coastal plantation setting paired low-relief shoreline ground with a slight rise for the mill site.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "enighed-stj",
    geoid: "7802035250",
    baseName: "Enighed",
    fullName: "Estate Enighed",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    historicalSummary:
      "Enighed Estate sat on a small knoll northeast of Enighed Pond and southeast of Cruz Bay.",
    topographicNotes:
      "Its location between pond and harbor made it part of the transitional terrain around Cruz Bay settlement.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "fareham-stx",
    geoid: "7801035650",
    baseName: "Fareham",
    fullName: "Estate Fareham",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Fareham Estate featured an estate house and mill near Fareham Bay and Fareham Point.",
    topographicNotes:
      "The estate sits in direct coastal relation to bay and point geography on the East End.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "fortuna-stt",
    geoid: "7803035890",
    baseName: "Fortuna",
    fullName: "Estate Fortuna",
    island: "stt",
    quarter: "Westend Quarter",
    historicalSummary:
      "Fortuna Estate is marked by the ruins of an estate house and a 30-foot high stone mill southwest of Fortuna Hill.",
    topographicNotes:
      "Fortuna Hill rises to about 910 feet, giving the estate a distinctly upland and ridge-associated character.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "fountain-stx",
    geoid: "7801036050",
    baseName: "Fountain",
    fullName: "Estate Fountain",
    island: "stx",
    quarter: "Northside B Quarter",
    historicalSummary:
      "Fountain Estate featured buildings in a southwest corner on a rounded bench of hills about 380 feet high, occupying the upper valley around the headstreams of Jealousy Bæk.",
    topographicNotes:
      "The estate is an upper-valley, headwater landscape with bench-like hill relief.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "golden-rock-stx",
    geoid: "7801044300",
    baseName: "Golden Rock",
    fullName: "Estate Golden Rock",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Golden Rock Estate featured an estate house prominently situated on a 66-foot knoll on the western shore of Christiansted Harbor.",
    topographicNotes:
      "Its low knoll and harbor-front setting made it one of the more visibly placed estates near Christiansted.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "granard-stx",
    geoid: "7801045050",
    baseName: "Granard",
    fullName: "Estate Granard",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Granard Estate had its farmstead centrally located northwest of Manchenil Bay and enveloped the neighboring Cornhill estate.",
    topographicNotes:
      "The estate’s footprint was broad enough to wrap around adjacent estate geography, giving it a dominant central position.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "greatpond-stx",
    geoid: "7801045525",
    baseName: "Great Pond",
    fullName: "Estate Great Pond",
    island: "stx",
    quarter: "Eastend A Quarter",
    aliases: ["Greatpond"],
    historicalSummary:
      "Great Pond Estate featured a hill and house just off Great Pond Bay, with cotton to the north and grassland elsewhere.",
    topographicNotes:
      "The estate combines immediate bay-edge geography with adjoining inland pond and field ground.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "hardlabor-stx",
    geoid: "7801046380",
    baseName: "Hard Labor",
    fullName: "Estate Hard Labor",
    island: "stx",
    quarter: "Prince Quarter",
    aliases: ["Hardlabor"],
    historicalSummary:
      "Hardlabor Estate was mostly grass, brush, and trees, with a house in a glen and a mill on a sharp spur 260 feet higher.",
    topographicNotes:
      "The estate’s dramatic vertical separation between house and mill highlights its broken ridge-and-glen terrain.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "hermitage-stx",
    geoid: "7801047600",
    baseName: "Hermitage",
    fullName: "Estate Hermitage",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Hermitage Estate on St. Croix was located in an enclosed valley near the sources of Bethlehem Gut.",
    topographicNotes:
      "Its setting is a classic interior valley and headwater plantation landscape.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "hogensborg-stx",
    geoid: "7801048030",
    baseName: "Hogensborg",
    fullName: "Estate Hogensborg",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Hogensborg Estate featured a village on the north side of Centerline Road with cane plain, orchards, and pasture nearby.",
    topographicNotes:
      "The estate is organized around one of the island’s major roads and a productive plain landscape.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "hope-stx",
    geoid: "7801048110",
    baseName: "Hope",
    fullName: "Estate Hope",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Hope Estate on St. Croix featured cane in its northern section and pasture in the south, with buildings facing a bight from a wooded ridge.",
    topographicNotes:
      "The estate joins agricultural ground with ridge-backed coastal frontage and a sheltered inlet.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "jerusalem-stx",
    geoid: "7801049700",
    baseName: "Jerusalem",
    fullName: "Estate Jerusalem and Figtree Hill",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    aliases: ["Jerusalem and Figtree Hill"],
    historicalSummary:
      "Jerusalem Estate featured a milltower on an 82-foot knoll north of Limetree Bay.",
    topographicNotes:
      "Its mill site was tied to a low rise above the coast and bay system.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "judiths-fancy-stx",
    geoid: "7801049960",
    baseName: "Judith's Fancy",
    fullName: "Estate Judiths Fancy",
    island: "stx",
    historicalSummary:
      "Judith’s Fancy occupied the Hemer Peninsula on the east side of Saltriver Bay, marked by a pinnacle hill and a perpendicular basalt cliff on the north side.",
    topographicNotes:
      "This estate has one of the strongest peninsula-and-cliff landforms in the St. Croix estate landscape.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "lameshur-stj",
    geoid: "7802053810",
    baseName: "Lameshur",
    fullName: "Estate Lameshur Complex",
    island: "stj",
    quarter: "Reef Bay Quarter",
    aliases: ["Lameshur Complex"],
    historicalSummary:
      "Lameshur Estate featured an estate house and flagstaff overlooking the bay from the shoulder of a ridge extending from the Bordeaux Mountains.",
    topographicNotes:
      "The estate combines ridge-shoulder elevation with direct visual command over Lameshur Bay.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "lavallee-stx",
    geoid: "7801054200",
    baseName: "La Vallee",
    fullName: "Estate La Vallee",
    island: "stx",
    quarter: "Northside B Quarter",
    aliases: ["Lavallee"],
    historicalSummary:
      "Lavallee occupied a small plain between two spurs of the Belvedere Hills, with its mill on the crest of a descending spur.",
    topographicNotes:
      "The estate is defined by hill-spur geometry, enclosed plain ground, and elevated mill placement.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "limetree-stx",
    baseName: "Limetree",
    fullName: "Estate Limetree",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    historicalSummary:
      "Limetree Estate contained several hills above 200 feet and was largely a sugar plantation.",
    topographicNotes:
      "It combined productive agricultural land with repeated hill relief rather than a single dominant summit.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "little-princess-stx",
    geoid: "7801054970",
    baseName: "Little Princess",
    fullName: "Estate Little Princess North",
    island: "stx",
    quarter: "Company Quarter",
    aliases: ["Little Princess South"],
    historicalSummary:
      "Little Princess Estate included a house, mill, settlement, and landing at the western extremity of Christiansted Harbor.",
    topographicNotes:
      "Its harbor-edge position gave it unusual maritime access compared with more inland estate tracts.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "lower-love-stx",
    geoid: "7801055930",
    baseName: "Lower Love",
    fullName: "Estate Lower Love",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Lower Love Estate featured an estate house north of Centerline Road and was the site of the first corn mill on St. Croix.",
    topographicNotes:
      "The estate is tied closely to the major road corridor and the head of Love Gut country.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "mafolie-stt",
    baseName: "Mafolie",
    fullName: "Estate Mafolie",
    island: "stt",
    historicalSummary:
      "Mafolie Estate featured a residence on Mafolie Hill along the crest of the main ridge, commanding a broad panorama across island, sea, and cays.",
    topographicNotes:
      "At about 842 feet, Mafolie Hill is one of the classic commanding ridge viewpoints on St. Thomas.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "manning-bay-stx",
    geoid: "7801056860",
    baseName: "Mannings Bay",
    fullName: "Estate Mannings Bay",
    island: "stx",
    quarter: "Prince Quarter",
    aliases: ["Manning Bay"],
    historicalSummary:
      "Manning Bay Estate featured a steel-frame windmill inland from the shore, along with an older mill tower and settlement farther back from the coast.",
    topographicNotes:
      "Its estate landscape stretches inland from bay frontage to mill and settlement ground.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "mars-hill-stx",
    geoid: "7801057050",
    baseName: "Mars Hill",
    fullName: "Estate Mars Hill and Stoney Ground",
    island: "stx",
    quarter: "Westend Quarter",
    aliases: ["Mars Hill and Stoney Ground"],
    historicalSummary:
      "Mars Hill Estate sat on a flat-topped eminence about 133 feet high, with cane and pasture spread across the tract.",
    topographicNotes:
      "Its defining landform is the broad flattopped rise that structures the surrounding estate ground.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "morningstar-stx",
    geoid: "7801057650",
    baseName: "Morningstar",
    fullName: "Estate Morning Star North",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    aliases: ["Morning Star", "Morning_Star", "Morning Star South"],
    historicalSummary:
      "Morningstar Estate featured a mill on a 130-foot hill southeast of Concordia Creek.",
    topographicNotes:
      "Its estate geography is organized around creek drainage and a low but distinct mill hill.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "mount-pleasant-stx",
    geoid: "7801057795",
    baseName: "Mount Pleasant",
    fullName: "Estate Mount Pleasant East",
    island: "stx",
    quarter: "Prince Quarter",
    aliases: ["Mount Pleasant North", "Mount Pleasant South"],
    historicalSummary:
      "Mount Pleasant Estate on St. Croix had its buildings situated on the northwest slope of a grassy hill.",
    topographicNotes:
      "The estate used the slope of a prominent hill rather than the summit itself for its principal built area.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "mount-victory-stx",
    geoid: "7801057880",
    baseName: "Mount Victory",
    fullName: "Estate Mount Victory",
    island: "stx",
    quarter: "Northside A Quarter",
    historicalSummary:
      "Mount Victory Estate had buildings nestled in a hollow southwest of a sharp ridge dividing the Caledonia and Crequis valleys.",
    topographicNotes:
      "The estate is strongly characterized by ridge division, valley separation, and protected hollow siting.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "mount-washington-stx",
    baseName: "Mount Washington",
    fullName: "Estate Mount Washington",
    island: "stx",
    quarter: "Northside A Quarter",
    historicalSummary:
      "Mount Washington Estate included a sharp detached peak on the main watershed and produced cane, fruit, and vegetables.",
    topographicNotes:
      "Its watershed summit makes it one of the more topographically pronounced estates in that district.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "nadir-stt",
    geoid: "7803058150",
    baseName: "Nadir",
    fullName: "Estate Nadir",
    island: "stt",
    quarter: "Redhook Quarter",
    historicalSummary:
      "Nadir Estate sits on the slopes of Nadirberg, a ridge in Redhook Quarter.",
    topographicNotes:
      "The estate belongs to the eastern ridge-and-bay terrain leading toward Red Hook and Nazareth country.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "neltjeberg-stt",
    geoid: "7803058750",
    baseName: "Neltjeberg",
    fullName: "Estate Neltjeberg",
    island: "stt",
    quarter: "Little Northside Quarter",
    historicalSummary:
      "Neltjeberg Estate lay on the northern shore of St. Thomas, overlooking Turrel Bay from Nellie Hill.",
    topographicNotes:
      "The estate is defined by coconut-grove coastland backed by northside hill relief.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "northside-stx",
    geoid: "7801060850",
    baseName: "Northside",
    fullName: "Estate Northside",
    island: "stx",
    quarter: "Northside A Quarter",
    historicalSummary:
      "Northside Estate stood on the seacoast at the northwestern extremity of St. Croix, with cane in the northeast and brush elsewhere.",
    topographicNotes:
      "It is a true edge-of-island coastal estate, mixing cultivated ground and rougher vegetation on exposed terrain.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "petronella-stx",
    geoid: "7801064300",
    baseName: "Petronella",
    fullName: "Estate Petronella",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Petronella Estate featured a mill on the brow of a low ridge forming the southeast spur of Carina Mountain, with cotton to the south and east.",
    topographicNotes:
      "Its ridge-brow mill placement and mountain-spur setting define the tract’s landform character.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "plessen-stx",
    geoid: "7801064630",
    baseName: "Plessen",
    fullName: "Estate Plessen North",
    island: "stx",
    quarter: "Prince Quarter",
    aliases: ["Plessen South"],
    historicalSummary:
      "Plessen Estate was intersected by Northside Road, with estate buildings on a modest rise and production in cane, provisions, and pasture.",
    topographicNotes:
      "Road access and lightly elevated building ground were central to the estate’s organization.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "princess-stx",
    baseName: "Princess",
    fullName: "Estate Princess",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    aliases: ["Grand Princess", "La Grande Princesse"],
    historicalSummary:
      "Princess Estate was a massive coastal property fronting the north shore and extending deeply inland.",
    topographicNotes:
      "Its large dimensions made it one of the broad estate landscapes in the Christiansted side of the island.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "prosperity-stx",
    geoid: "7801064915",
    baseName: "Prosperity",
    fullName: "Estate Prosperity",
    island: "stx",
    quarter: "Northside A Quarter",
    historicalSummary:
      "Prosperity Estate featured an old mill tower on the slope of a spur, with an estate house between the hill and the beach.",
    topographicNotes:
      "Its settlement pattern explicitly links spur slope, shoreline, and built core in one narrow sequence.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "recovery-stx",
    geoid: "7801065450",
    baseName: "Recovery",
    fullName: "Estate Recovery and Welcome",
    island: "stx",
    quarter: "Company Quarter",
    aliases: ["Recovery Hill", "Recovery and Welcome"],
    historicalSummary:
      "Recovery Estate occupied much of the Christiansted Hills and featured a residence at the end of a trail in a glen.",
    topographicNotes:
      "Its setting is one of interior broken hills and enclosed folds rather than open plantation plain.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "reefbay-stj",
    baseName: "Reefbay",
    fullName: "Estate Reef Bay",
    island: "stj",
    quarter: "Reef Bay Quarter",
    aliases: ["Reef Bay"],
    historicalSummary:
      "Reefbay Estate bordered Reef Bay and featured bananas, coconuts, a sugar mill, and cattle ranching.",
    topographicNotes:
      "The estate combines bay frontage, valley descent, and productive tropical ground along the south shore.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "richmond-stx",
    geoid: "7801065830",
    baseName: "Richmond",
    fullName: "Estate Richmond",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Richmond Estate lay adjacent to Christiansted on the west and included harbor frontage.",
    topographicNotes:
      "Its geography is tied to the urban-harbor edge rather than a remote rural setting.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "rustoptwist-stx",
    baseName: "Rustoptwist",
    fullName: "Estate Rustoptwist",
    island: "stx",
    quarter: "Northside B Quarter",
    historicalSummary:
      "Rustoptwist Estate was nestled in a small valley ringed by five hills, with an old mill top positioned on a bench at the northwest foot of Rustoptwist Hill.",
    topographicNotes:
      "This is one of the clearest enclosed-basin estate landscapes on St. Croix.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "sallys-fancy-stx",
    geoid: "7801068530",
    baseName: "Sally's Fancy",
    fullName: "Estate Sallys Fancy",
    island: "stx",
    quarter: "Eastend A Quarter",
    aliases: ["Sallys Fancy"],
    historicalSummary:
      "Sally’s Fancy was located northwest of Great Pond on a sizeable East End tract.",
    topographicNotes:
      "Its estate geography belongs to the rolling hill-and-bay landscape of the East End quarter system.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "sion-farm-stx",
    geoid: "7801071300",
    baseName: "Sion Farm",
    fullName: "Estate Sion Farm",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    historicalSummary:
      "Sion Farm Estate featured a house on a hill south of Sion Hill.",
    topographicNotes:
      "The estate is organized around paired hill forms and cultivated mid-island terrain.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "slob-stx",
    baseName: "Slob",
    fullName: "Estate Slob",
    island: "stx",
    quarter: "King Quarter",
    historicalSummary:
      "Slob Estate featured Slob Mill on a hill north of Centerline Road.",
    topographicNotes:
      "Its key landform is the mill hill rising above the central road corridor.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "solberg-stt",
    geoid: "7803073550",
    baseName: "Solberg",
    fullName: "Estate Solberg",
    island: "stt",
    quarter: "Great Northside Quarter",
    historicalSummary:
      "Solberg Estate featured a mill on a bench of a ridge south-southwest of Signal Hill.",
    topographicNotes:
      "Its geography is dominated by a high ridge system and benchmark mill siting on a bench below the crest.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "solitude-stx",
    baseName: "Solitude",
    fullName: "Estate Solitude",
    island: "stx",
    quarter: "Northside B Quarter",
    historicalSummary:
      "Solitude Estate included Mount Eagle in its northeast corner, with Solitude Hill on its south slope.",
    topographicNotes:
      "The estate is strongly structured by upland mountain mass and descending slope geography.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "sprat-hall-stx",
    geoid: "7801075950",
    baseName: "Sprat Hall",
    fullName: "Estate Sprat Hall",
    island: "stx",
    historicalSummary:
      "Sprat Hall Estate featured an estate village near Sprat Hole and included much of the Crequis Valley.",
    topographicNotes:
      "Its extent across valley ground made it a major territorial estate in that district.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "springgarden-stx",
    geoid: "7801076200",
    baseName: "Spring Garden",
    fullName: "Estate Spring Garden",
    island: "stx",
    historicalSummary:
      "Springgarden Estate featured a house in the upper valley of Caledonia, with a mill on the opposite ridge and plantations of cocoa, coffee, mangoes, oranges, and vanilla.",
    topographicNotes:
      "This estate shows a rich valley-and-ridge agricultural environment with unusually diverse cultivation.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "tutu-stt",
    baseName: "Tutu",
    fullName: "Estate Tutu",
    island: "stt",
    quarter: "New (Prince George) Quarter",
    aliases: [
      "Anna's Retreat",
      "Annas Retreat",
      "Anna S Retreat",
      "Anna S. Retreat",
    ],
    historicalSummary:
      "Tutu Estate was located in the eastern part of New Quarter south of Tutu Bay.",
    topographicNotes:
      "Its landscape belongs to the interior-to-eastward corridor linking Charlotte Amalie basin with the eastern estates.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "upper-love-stx",
    geoid: "7801080400",
    baseName: "Upper Love",
    fullName: "Estate Upper Love",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Upper Love Estate was a sugar plantation traversed by roads and watered by the upper course of Love Gut, with settlement on the slope of Love Hill.",
    topographicNotes:
      "Its defining geography is a road-crossed upland drainage corridor centered on Love Gut and Love Hill.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "waldberggaard-stx",
    geoid: "7801081900",
    baseName: "Waldberggaard",
    fullName: "Estate Waldberggaard",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Waldberggaard Estate featured a stream, well, road, and old millsite in its southwest corner, while the rest consisted of sloping spurs of a wooded peak.",
    topographicNotes:
      "The estate blends serviceable lower corner ground with steep, brushy spurs rising toward a major summit.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "whim-stx",
    baseName: "Whim",
    fullName: "Estate The Whim",
    island: "stx",
    quarter: "Westend Quarter",
    aliases: ["The Whim East", "The Whim West"],
    historicalSummary:
      "Whim Estate featured two pastures with the remainder planted in sugar cane southeast of Frederiksted.",
    topographicNotes:
      "It is one of the characteristic large agricultural estates of the Frederiksted side.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "william-stx",
    geoid: "7801085550",
    baseName: "William",
    fullName: "Estate William",
    island: "stx",
    quarter: "Northside A Quarter",
    historicalSummary:
      "William Estate extended along the shore and inland through extensive canefields, with a village on the shore road.",
    topographicNotes:
      "Its form is elongated from coast to interior, linking shore settlement with plantation ground behind.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "windberg-stj",
    baseName: "Windberg",
    fullName: "Estate Windberg",
    island: "stj",
    quarter: "Maho Quarter",
    historicalSummary:
      "Windberg Estate featured buildings or ruins south of a high hill.",
    topographicNotes:
      "Its estate site is associated with elevated north shore terrain and mountain-backed settlement.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "work-and-rest-stx",
    geoid: "7801085900",
    baseName: "Work and Rest",
    fullName: "Estate Work and Rest",
    island: "stx",
    quarter: "Company Quarter",
    aliases: ["Work-and-Rest"],
    historicalSummary:
      "Work-and-Rest Estate featured a mill on its easternmost tract, with the remainder almost coextensive with an isolated hill system.",
    topographicNotes:
      "Its terrain ties estate identity directly to a self-contained hill mass rather than a plain or single valley.",
    sources: ["User-supplied estate notes"],
  },
  {
    slug: "adjett-stx",
    baseName: "Adjett",
    island: "stx",
    quarter: "Eastend B Quarter",
    historicalSummary:
      "Adjett Estate is located in the Eastend B Quarter of St. Croix and forms a point or acute projection hooked around the eastern end of Jack Bay.",
    topographicNotes:
      "The estate is defined by its pointed coastal geometry around the eastern end of Jack Bay.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "adrian-stj",
    baseName: "Adrian",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    historicalSummary:
      "Adrian Estate is situated on Centerline Road in the Cruz Bay Quarter of St. John and is associated with the old ruins of a sugar factory.",
    topographicNotes:
      "A large uncultivated grove of guava trees lies just northeast of the estate.",
    cartographicNotes:
      "The estate is identified along Centerline Road within the Cruz Bay Quarter framework.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "allandale-stx",
    baseName: "Allandale",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Allandale Estate is located in the Prince Quarter of St. Croix near the source of the Mint Gut watercourse.",
    topographicNotes: "Its geography is tied to the headwaters of Mint Gut.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "all-for-the-better-stx",
    baseName: "All-for-the-Better",
    island: "stx",
    quarter: "Eastend A Quarter",
    aliases: ["All for the Better"],
    historicalSummary:
      "All-for-the-Better Estate is located in the Eastend A Quarter of St. Croix and features a mill situated on a 220-foot bench on the westerly spur of the Seven Hills.",
    topographicNotes:
      "The estate is associated with the Seven Hills ridge system and an elevated mill location.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "bonne-esperance-northside-b-stx",
    baseName: "Bonne Espérance",
    island: "stx",
    quarter: "Northside B Quarter",
    aliases: ["Bonne Esperance"],
    historicalSummary:
      "Bonne Espérance Estate in St. Croix's Northside B Quarter features the ruins of a mill on a 380-foot ridge.",
    topographicNotes:
      "The ruins stand on the west side of a gut or glen traversed by a trail ascending from Lebanon.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "bonne-esperance-queen-stx",
    baseName: "Bonne Espérance",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    aliases: ["Bonne Esperance"],
    historicalSummary:
      "Bonne Espérance Estate in St. Croix's Queen Quarter features centrally located buildings on a hill rising to roughly 290 feet or more.",
    topographicNotes:
      "The estate core is set on elevated terrain rather than low coastal ground.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "bonne-esperance-stt",
    baseName: "Bonne Esperance",
    island: "stt",
    quarter: "Westend Quarter",
    aliases: ["Bonne Espérance"],
    historicalSummary:
      "Bonne Esperance Estate on St. Thomas is situated on a ridge at an elevation of about 871 feet overlooking Perseverance Bay.",
    topographicNotes:
      "Perseverance Bay lies roughly 500 yards to the south-southwest.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "bordeaux-stt",
    baseName: "Bordeaux",
    island: "stt",
    quarter: "Westend Quarter",
    historicalSummary:
      "Bordeaux Estate on St. Thomas features a Moravian School on rising ground near Bordeaux Bay.",
    topographicNotes:
      "The school site lies about 80 yards from a steep bluff and 225 yards east of Bordeaux Bay on the northern shore.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "bordeaux-stj",
    baseName: "Bordeaux",
    island: "stj",
    quarter: "Coral Bay Quarter",
    historicalSummary:
      "Bordeaux Estate on St. John is located on the crest of the Bordeaux Mountains about a half-mile west of Coral Bay.",
    topographicNotes:
      "Its buildings occupy extreme elevations ranging from roughly 1,125 to 1,242 feet.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "buonavista-stj",
    baseName: "Buonavista",
    island: "stj",
    historicalSummary:
      "Buonavista Estate on St. John is located about 650 yards south-southwest of Parforce on the shoulder of a hill where Lameshur Road ascends the ridge.",
    topographicNotes:
      "Its setting is defined by hillside terrain along the Lameshur Road ascent.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "butzberg-stx",
    baseName: "Butzberg",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Butzberg Estate on St. Croix features a mill on a ridge at about 180 feet in elevation.",
    topographicNotes:
      "The mill lies roughly 360 yards southeast of the east end of Altona Lagoon.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "canaan-stt",
    baseName: "Canaan",
    island: "stt",
    quarter: "Great Northside Quarter",
    historicalSummary:
      "Canaan Estate on St. Thomas is positioned on a 410-foot bench of a hill spur southeast of Magens Bay.",
    topographicNotes:
      "The estate lies about 660 yards southeast of Magens Bay.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "canaan-stx",
    baseName: "Canaan",
    island: "stx",
    quarter: "Northside B Quarter",
    historicalSummary:
      "Canaan Estate on St. Croix occupies a pretty little valley at the head stream of Concordia Gut.",
    topographicNotes:
      "The estate lies about one and a half miles from the north coast.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "canevalley-stx",
    baseName: "Canevalley",
    island: "stx",
    quarter: "Westend Quarter",
    aliases: ["Cane Valley"],
    historicalSummary:
      "Canevalley Estate is located in the eastern tier of the Westend Quarter of St. Croix.",
    topographicNotes:
      "It lies about two and a half miles inland from Westend Bay.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "caramaw-hall-stx",
    baseName: "Caramaw Hall",
    island: "stx",
    quarter: "King Quarter",
    historicalSummary:
      "Caramaw Hall Estate is situated on the north shore of Krause Lagoon in St. Croix.",
    topographicNotes:
      "The estate lies near a 60-foot eminence known as Caramaw Hill.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "caretbay-stt",
    baseName: "Caretbay",
    island: "stt",
    quarter: "Little Northside Quarter",
    aliases: ["Caret Bay"],
    historicalSummary:
      "Caretbay Estate on St. Thomas sits on a hill reaching about 796 feet in elevation.",
    topographicNotes:
      "It is located roughly 1,000 yards south-southeast of Caret Bay.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "carlton-stx",
    baseName: "Carlton",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Carlton Estate is located in the southeastern portion of the Westend Quarter of St. Croix.",
    topographicNotes:
      "Its estate village lies about two miles southeast of Frederiksted.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "catherineberg-stj",
    baseName: "Catherineberg",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    historicalSummary:
      "Catherineberg Estate on St. John is located about five-eighths of a mile south of Cinnamon Bay, at or near Hammer Farm.",
    topographicNotes:
      "The estate occupies upland ground south of Cinnamon Bay in the Cruz Bay Quarter.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "catherines-hope-stt",
    baseName: "Catherine's Hope",
    island: "stt",
    quarter: "Westend Quarter",
    aliases: ["Catherines Hope"],
    historicalSummary:
      "Catherine's Hope Estate on St. Thomas is situated north of David Point or Fortuna Bay in the Westend Quarter.",
    topographicNotes:
      "Its setting ties the estate to the western coastal district near Fortuna Bay.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "clausen-stt",
    baseName: "Clausen",
    island: "stt",
    historicalSummary:
      "Clausen Estate on St. Thomas is located about 1,050 yards south-southeast of Pearl and just south of Crown Hill.",
    topographicNotes:
      "Its position places it in the uplands south of Crown Hill.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "concordia-westend-stx",
    baseName: "Concordia",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Concordia Estate in St. Croix's Westend Quarter is intersected by a direct road to Frederiksted.",
    topographicNotes:
      "It features a 290-foot grassy hill in its northeast quarter and buildings on a 120-foot rise sloping gently south to the coast.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "contentment-stx",
    baseName: "Contentment",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Contentment Estate occupies the center of Contentment Valley on St. Croix.",
    topographicNotes:
      "It lies south of Fredensdal and is drained by the Contentment Gut rivulet.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "elizas-retreat-stx",
    baseName: "Eliza's Retreat",
    island: "stx",
    aliases: ["Elizas Retreat"],
    historicalSummary:
      "Eliza's Retreat Estate on St. Croix is located 120 yards south of Lang's Observatory and about one mile east-southeast of Christiansted.",
    topographicNotes:
      "Its setting places it close to the Christiansted urban sphere.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "emmaus-stj",
    baseName: "Emmaus",
    island: "stj",
    quarter: "Coral Bay Quarter",
    aliases: ["Emaus"],
    historicalSummary:
      "Emmaus Estate on St. John is conspicuously situated near the north end of Coral Harbor.",
    topographicNotes:
      "Its visibility and harbor adjacency make it a prominent Coral Bay Quarter estate.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "fannys-fancy-stx",
    baseName: "Fanny's Fancy",
    island: "stx",
    quarter: "Eastend B Quarter",
    aliases: ["Fannys Fancy"],
    historicalSummary:
      "Fanny's Fancy Estate on St. Croix is located at the west point of Rod Bay in the Eastend B Quarter.",
    topographicNotes:
      "The estate occupies a strategic coastal point at Rod Bay.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "goodhope-stx",
    baseName: "Goodhope",
    island: "stx",
    quarter: "Westend Quarter",
    aliases: ["Good Hope"],
    historicalSummary:
      "Goodhope Estate on St. Croix is situated on the south coast and historically supported sugarcane cultivation.",
    topographicNotes:
      "Most of the land served as pastureland beyond the cane fields.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "groveplace-stx",
    baseName: "Groveplace",
    island: "stx",
    quarter: "Prince Quarter",
    aliases: ["Grove Place"],
    historicalSummary:
      "Groveplace Estate on St. Croix features a main settlement on a sloping plain watered by two streams and bordered by main roads.",
    topographicNotes:
      "Its settlement pattern is tied to water access and the island's road network.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "mount-stewart-stx",
    baseName: "Mount Stewart",
    island: "stx",
    quarter: "Northside A Quarter",
    historicalSummary:
      "Mount Stewart Estate stretches across the Northside A Quarter of St. Croix.",
    topographicNotes:
      "Its estatehouse, mill, and orchard are nestled in a valley about 750 yards southwest of Mount Stewart Hill.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "mount-washington-northside-a-stx",
    baseName: "Mount Washington",
    island: "stx",
    quarter: "Northside A Quarter",
    historicalSummary:
      "Mount Washington Estate in St. Croix's Northside A Quarter includes a sharp detached peak rising about 527 feet on the main watershed.",
    topographicNotes:
      "The estate's terrain is dominated by the watershed peak.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "mount-washington-eastend-a-stx",
    baseName: "Mount Washington",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Mount Washington Estate in St. Croix's Eastend A Quarter features groves in the northwest and on a ridge in the southeast.",
    topographicNotes:
      "Much of the remainder is described as overgrown terrain.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "mount-welcome-stx",
    baseName: "Mount Welcome",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Mount Welcome Estate on St. Croix includes a 125-foot isolated and heavily wooded hill overlooking Christiansted Harbor.",
    topographicNotes:
      "The hill is crowned by a stone tower and ruined sugar mill.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "nicholas-stx",
    baseName: "Nicholas",
    island: "stx",
    historicalSummary:
      "Nicholas Estate on St. Croix is chiefly situated on a plateau more than 700 feet above sea level.",
    topographicNotes:
      "A mill is located about 725 yards northeast of Mount Washington.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "nugent-castle-nugent-stx",
    baseName: "Nugent",
    island: "stx",
    quarter: "Eastend A Quarter",
    aliases: ["Castle Nugent"],
    historicalSummary:
      "Nugent, also known as Castle Nugent, features a manse or estatehouse located about half a mile from the south coast of St. Croix.",
    topographicNotes:
      "Its estate core sits inland from the shoreline rather than directly on it.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "paquerau-stj",
    baseName: "Paquerau",
    island: "stj",
    historicalSummary:
      "Paquerau Estate on St. John features a mill on a 720-foot bench of a 1,099-foot summit.",
    topographicNotes: "The mill lies about 750 yards south of Mamey Peak.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "paradise-stx",
    baseName: "Paradise",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Paradise Estate on St. Croix features a mill at the southern foot of Mount Pleasant.",
    topographicNotes:
      "The estate house lies about one mile from the southern coast.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "parasol-stx",
    baseName: "Parasol",
    island: "stx",
    quarter: "Northside B Quarter",
    historicalSummary:
      "Parasol Estate on St. Croix features a 747-foot peak on the main watershed.",
    topographicNotes:
      "Its mill is located on the road in the southwest corner of the estate.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "parforce-stj",
    baseName: "Parforce",
    island: "stj",
    quarter: "Reef Bay Quarter",
    historicalSummary:
      "Parforce Estate on St. John occupies the plain at the south end of a two-mile valley opening on the northeast shore of Reef Bay.",
    topographicNotes:
      "Its geography is defined by the long valley descending toward Reef Bay.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "pleasant-valley-stx",
    baseName: "Pleasant Valley",
    island: "stx",
    historicalSummary:
      "Pleasant Valley Estate on St. Croix is situated on Crequis Road near the head of Crequis Valley.",
    topographicNotes:
      "Its setting ties it directly to upland road and valley geography.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "plessen-stx",
    baseName: "Plessen",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Plessen Estate on St. Croix measures approximately 4,000 by 3,000 feet and is intersected by Northside Road.",
    topographicNotes: "The estate buildings are positioned on a 117-foot rise.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "princess-grand-princess-stx",
    baseName: "Princess",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    aliases: ["Grand Princess"],
    historicalSummary:
      "Princess, also known as Grand Princess, is a massive St. Croix estate fronting the northern coast.",
    topographicNotes:
      "It measures about 2,100 yards north-south and 1,375 yards east-west.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "profit-stx",
    baseName: "Profit",
    island: "stx",
    quarter: "King Quarter",
    historicalSummary:
      "Profit Estate on St. Croix features a mill situated in the southern bowl of the Kingshill Range.",
    topographicNotes:
      "Its estate geography is tied to the basin formed by the range.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "prospect-hill-stx",
    baseName: "Prospect Hill",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Prospect Hill Estate on St. Croix features estate buildings situated on a hill in the southeast corner of the tract.",
    topographicNotes:
      "Its built center occupies elevated southeastern terrain.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "prosperity-northside-b-stx",
    baseName: "Prosperity",
    island: "stx",
    quarter: "Northside B Quarter",
    historicalSummary:
      "Prosperity Estate in St. Croix's Northside B Quarter lies on the northern coast.",
    topographicNotes:
      "It features an old mill tower on the slope of a spur to the west and an estatehouse on the beach.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "prosperity-westend-stx",
    baseName: "Prosperity",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Prosperity Estate in St. Croix's Westend Quarter contains buildings located between 140 and 560 yards from the shore.",
    topographicNotes:
      "The estate includes beach pasture and a mahogany grove adjoining Prosperity Garden.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "recovery-stx",
    baseName: "Recovery",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Recovery Estate on St. Croix occupies much of the Christiansted Hills.",
    topographicNotes:
      "It features a residence at the end of a trail in a glen.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "retreat-stx",
    baseName: "Retreat",
    island: "stx",
    historicalSummary:
      "Retreat Estate on St. Croix features a residence on the road about three-quarters of a mile from Vagthus Point.",
    topographicNotes:
      "Its estate core lies inland from the point along the road corridor.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "shoys-stx",
    baseName: "Shoy's",
    island: "stx",
    quarter: "Eastend A Quarter",
    aliases: ["Shop", "Shoys"],
    historicalSummary:
      "Shoy's Estate on St. Croix lies directly on the north coast in the Eastend A Quarter.",
    topographicNotes:
      "Its coastal position is one of its defining geographic traits.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "sight-stx",
    baseName: "Sight",
    island: "stx",
    historicalSummary:
      "Sight Estate on St. Croix strategically occupies a gap in the central ridge between Maria Hill and Mount Washington.",
    topographicNotes: "A road traverses the eastern edge of the estate.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "sion-farm-stx",
    baseName: "Sion Farm",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    historicalSummary:
      "Sion Farm Estate on St. Croix is located on the north side of Centerline Road.",
    topographicNotes:
      "It features a house on a 180-foot hill about half a mile south of Sion Hill.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "slob-stx",
    baseName: "Slob",
    island: "stx",
    quarter: "King Quarter",
    historicalSummary:
      "Slob Estate on St. Croix features Slob Mill on a hill north of Centerline Road.",
    topographicNotes:
      "The mill is situated on a hill approximately 179 feet high at the west side of tract 19.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "smithbay-stt",
    baseName: "Smithbay",
    island: "stt",
    quarter: "Eastend Quarter",
    aliases: ["Smith Bay"],
    historicalSummary:
      "Smithbay Estate on St. Thomas lies about half a mile southwest of Water Bay.",
    topographicNotes: "It features old ruins on a 68-foot knoll.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "testman-stx",
    baseName: "Testman",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Testman Estate on St. Croix features a well and lies just south of the west end of Southgate Pond.",
    topographicNotes: "Its landscape is tied to the Southgate Pond basin.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "tropaco-stt",
    baseName: "Tropaco",
    island: "stt",
    historicalSummary:
      "Tropaco Estate on St. Thomas is located about 760 yards north of Kramew or Brewers Bay.",
    topographicNotes:
      "Its location places it inland from the Brewers Bay district.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "two-brothers-stx",
    baseName: "Two Brothers",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Two Brothers Estate on St. Croix is bounded by Smithfield on the south and Westend Bay on the west.",
    topographicNotes: "The Westend Bay boundary extends for about 240 yards.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "uhrbay-stt",
    baseName: "Uhrbay",
    island: "stt",
    historicalSummary:
      "Uhrbay Estate on St. Thomas is situated on the south side of the island in an enclosed valley between Annedewinl Bay and Grigribay, in the vicinity of Bovoni.",
    topographicNotes:
      "Its geography is defined by a sheltered valley setting between two bays near Bovoni.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "uitendal-stt",
    baseName: "Uitendal",
    island: "stt",
    historicalSummary:
      "Uitendal Estate on St. Thomas is located near the fork of Tutu and Turpentine Roads, occupying an enclosed valley northwest of Jersey Bay.",
    topographicNotes:
      "The estate lies in a road-connected valley landscape inland from Jersey Bay.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "upper-love-stx",
    baseName: "Upper Love",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Upper Love Estate on St. Croix was a sugar plantation in the Prince Quarter traversed by several roads and watered by the upper course of Love Gut.",
    topographicNotes:
      "Its main settlement was positioned on the south slope of the 267-foot Love Hill.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "valley-stx",
    baseName: "Valley",
    island: "stx",
    quarter: "Eastend B Quarter",
    historicalSummary:
      "Valley Estate on St. Croix is located in the Eastend B Quarter and features the ruins of an estate house at the head of a glen.",
    topographicNotes:
      "The site is reachable by a trail from Hodge Estate, and a mill formerly stood on the ridge to the east.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "vessup-stt",
    baseName: "Vessup",
    island: "stt",
    historicalSummary:
      "Vessup Estate on St. Thomas is positioned about 830 yards north of Jersey Bay, not far from the shores of Vessup Bay.",
    topographicNotes:
      "Its landscape connects the inland estate tract with the Vessup Bay shoreline district.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "volkert-stt",
    baseName: "Volkert",
    island: "stt",
    historicalSummary:
      "Volkert Estate on St. Thomas features an old estate house that serves as a prominent landmark on the ridge north of St. Thomas Harbor.",
    topographicNotes:
      "The estate lies not far from Mafolie along the ridge system overlooking the harbor.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "vughl-stt",
    baseName: "Vughl",
    island: "stt",
    historicalSummary:
      "Vughl Estate on St. Thomas is located roughly half a mile east-southeast of New Herrnhut.",
    topographicNotes:
      "Its position places it within the eastern inland zone beyond New Herrnhut.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "wade-stx",
    baseName: "Wade",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Wade Estate on St. Croix is situated in the Westend Quarter and extends southward directly to the shoreline.",
    topographicNotes:
      "Its tract is notable for reaching from inland ground straight to the coast.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "waldberggaard-stx",
    baseName: "Waldberggaard",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Waldberggaard Estate on St. Croix features a stream, a well, and an old mill site in its southwest corner.",
    topographicNotes:
      "The remainder of the estate consists of the sloping spurs of a 923-foot peak covered with grass, bushes, and trees.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "wheel-of-fortune-stx",
    baseName: "Wheel-of-Fortune",
    island: "stx",
    quarter: "Westend Quarter",
    aliases: ["Wheel of Fortune"],
    historicalSummary:
      "Wheel-of-Fortune Estate on St. Croix is located in the Westend Quarter and measures approximately 1,590 feet north-to-south by 3,250 feet east-to-west.",
    topographicNotes:
      "It is bounded by Centerline Road, Smithfield, and Westend Bay.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "whim-stx",
    baseName: "Whim",
    island: "stx",
    quarter: "Westend Quarter",
    aliases: ["John's Rest", "Johns Rest"],
    historicalSummary:
      "Whim Estate on St. Croix, historically known as John's Rest, lies about 1.5 miles southeast of Frederiksted and roughly five-eighths of a mile from the south coast.",
    topographicNotes:
      "It features two pastures, while the remainder of the land was dedicated to sugarcane cultivation.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "wildhagen-stt",
    baseName: "Wildhagen",
    island: "stt",
    historicalSummary:
      "Wildhagen Estate on St. Thomas is located at the southwest head of Vessup Bay.",
    topographicNotes:
      "Its geography ties it closely to the inland head of the bay rather than the outer shore.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "william-stx",
    baseName: "William",
    island: "stx",
    quarter: "Northside A Quarter",
    historicalSummary:
      "William Estate on St. Croix is situated in the Northside A Quarter and extends about 1,000 yards along the coast and more than 2,000 yards inland.",
    topographicNotes:
      "It includes an estate village on the shore road, extensive cane fields in the west, and eastern portions used as grassland.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "windsor-stx",
    baseName: "Windsor",
    island: "stx",
    quarter: "Northside B Quarter",
    historicalSummary:
      "Windsor Estate on St. Croix features Windsor Hill, rising about 872 feet and covered with low trees.",
    topographicNotes:
      "The hill is surmounted by a mill and forms the estate's most prominent topographic feature.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "wintberg-stt",
    baseName: "Wintberg",
    island: "stt",
    quarter: "New (Prince George) Quarter",
    historicalSummary:
      "Wintberg Estate on St. Thomas is a ruined estate situated on a col of the main ridge at an elevation of about 710 feet.",
    topographicNotes: "It lies roughly 500 yards northeast of Wintberg Peak.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "work-and-rest-stx",
    baseName: "Work-and-Rest",
    island: "stx",
    quarter: "Company Quarter",
    aliases: ["Work and Rest"],
    historicalSummary:
      "Work-and-Rest Estate on St. Croix is located in the Company Quarter and is almost coextensive with an isolated hill system.",
    topographicNotes: "A mill stood on its easternmost tract.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "zambee-stt",
    baseName: "Zambee",
    island: "stt",
    quarter: "Westend Quarter",
    historicalSummary:
      "Zambee Estate on St. Thomas is positioned on the southwestern slope of Crown Mountain at the east end of the Westend Quarter.",
    topographicNotes:
      "Its location ties the estate to the slope system descending from Crown Mountain.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "zeger-stt",
    baseName: "Zeger",
    island: "stt",
    historicalSummary:
      "Zeger Estate on St. Thomas is an old estate located near Santa Maria Estate.",
    topographicNotes:
      "Its significance lies in its historic placement within the western St. Thomas estate landscape.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "beeston-hill-stx",
    baseName: "Beeston Hill",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Beeston Hill Estate on St. Croix has its estate house on a 330-foot hill on the brow of the most easterly bench of Bulowminde Hill.",
    topographicNotes:
      "Its estate core occupies elevated terrain within the Company Quarter.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "bugby-hole-stx",
    baseName: "Bugby Hole",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Bugby Hole Estate is located in the east-central part of the Company Quarter on St. Croix.",
    topographicNotes:
      "Its identification is primarily quarter-based within the central Company district.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "constitution-hill-stx",
    baseName: "Constitution Hill",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    historicalSummary:
      "Constitution Hill Estate on St. Croix is situated on a 350-foot hill of the same name in the Queen Quarter.",
    topographicNotes:
      "It shares a border with the Company Quarter, marking an inter-quarter upland zone.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "cottongrove-stx",
    baseName: "Cottongrove",
    island: "stx",
    quarter: "Eastend A Quarter",
    aliases: ["Cotton Grove"],
    historicalSummary:
      "Cottongrove Estate on St. Croix features an old mill tower and mansion ruins on a spur of Cottongrove Hill.",
    topographicNotes:
      "The ridge rises to about 860 feet near the boundary of the Eastend A and Eastend B Quarters.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "enfield-green-stx",
    baseName: "Enfield Green",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Enfield Green Estate on St. Croix comprised extensive sugarcane plantations and a small castor-oil plantation on the south shore.",
    topographicNotes:
      "Its landscape combined broad agricultural fields with a south-shore plantation setting.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "golden-rock-stx",
    baseName: "Golden Rock",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Golden Rock Estate on St. Croix features an estate house positioned on a 66-foot knoll on the western shore of Christiansted Harbor.",
    topographicNotes:
      "Its prominence comes from its elevated harbor-edge position.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "granard-stx",
    baseName: "Granard",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Granard Estate on St. Croix has its farmstead about 1,250 yards northwest of Manchenil Bay in the southerly portion of the Company Quarter.",
    topographicNotes:
      "Its estate core is inland from the bay within the southern Company district.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "hesselberg-stx",
    baseName: "Hesselberg",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Hesselberg Estate on St. Croix lies at the northeast end of Westend Saltpond.",
    topographicNotes:
      "The estate consisted chiefly of grassland with scattered trees.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "hogensborg-stx",
    baseName: "Hogensborg",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Hogensborg Estate on St. Croix is located on the north side of Centerline Road.",
    topographicNotes:
      "It features a plain to the east planted in sugarcane together with orchards and pastures.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "lareine-stx",
    baseName: "Lareine",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    aliases: ["La Reine"],
    historicalSummary:
      "Lareine Estate on St. Croix lies in the Queen Quarter and includes hills in the northeast and south covered with grass and trees.",
    topographicNotes:
      "The remainder of the tract served as a sugar plantation.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "little-princess-stx",
    baseName: "Little Princess",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Little Princess Estate on St. Croix includes a house, a mill, and a settlement with a landing at the western extremity of Christiansted Harbor.",
    topographicNotes:
      "Its location ties it directly to the harbor edge and landing infrastructure.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "lower-love-stx",
    baseName: "Lower Love",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Lower Love Estate on St. Croix lies in the Prince Quarter with its estate house positioned 350 yards north of Centerline Road and 350 yards west of Jealousy Gut.",
    topographicNotes:
      "Its estate core sits near the road and gut corridor in the central agricultural belt.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "mount-pleasant-colquohoun-stx",
    baseName: "Mount Pleasant",
    island: "stx",
    quarter: "King Quarter",
    aliases: ["Colquohoun", "Mount Pleasant (Colquohoun)"],
    historicalSummary:
      "Mount Pleasant, also associated with Colquohoun, features a mill and settlement on the southeast slope of a hill in St. Croix's King Quarter.",
    topographicNotes:
      "The settlement lies about 370 yards northeast of Bethlehem Gut.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "mount-pleasant-prince-stx",
    baseName: "Mount Pleasant",
    island: "stx",
    quarter: "Prince Quarter",
    aliases: ["Mount Pleasant (Prince Quarter)"],
    historicalSummary:
      "Mount Pleasant Estate in St. Croix's Prince Quarter features buildings on the northwest slope of a grassy hill about four miles east of Frederiksted.",
    topographicNotes:
      "It included a 525-yard square corn patch in its southwest corner, while the rest of the cultivable land was planted in sugarcane.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "bethesda-stt",
    baseName: "Bethesda",
    fullName: "Estate Bethesda",
    island: "stt",
    quarter: "Westend Quarter",
    historicalSummary:
      "Bethesda is an estate on St. Thomas located on the southeast side of the road northeast of Fortuna Estate and near Fortuna Hill.",
    topographicNotes:
      "The estate lies in the Westend Quarter not far from a summit rising to about 766 feet.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "botanybay-stt",
    baseName: "Botanybay",
    fullName: "Estate Botanybay",
    island: "stt",
    quarter: "Westend Quarter",
    aliases: ["Botany Bay"],
    historicalSummary:
      "Botanybay is an estate on St. Thomas situated on the east shore of Botany Bay.",
    topographicNotes:
      "It is noted historically as a banana plantation closely tied to the bay shoreline.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "dorothea-stt",
    baseName: "Dorothea",
    fullName: "Estate Dorothea",
    island: "stt",
    quarter: "Little Northside Quarter",
    historicalSummary:
      "Dorothea is an estate on St. Thomas located about three-quarters of a mile south of Dorothea Bay.",
    topographicNotes:
      "The estate is situated on Northside Road within the Little Northside Quarter.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "altona-stt",
    baseName: "Altona",
    fullName: "Estate Altona",
    island: "stt",
    quarter: "Southside Quarter",
    historicalSummary:
      "Altona is an estate on St. Thomas adjoining the western suburbs of St. Thomas City.",
    topographicNotes:
      "Its location places it in the Southside Quarter near the urban edge of Charlotte Amalie.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "bethany-stj",
    baseName: "Bethany",
    fullName: "Estate Bethany",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    aliases: ["Bethania"],
    historicalSummary:
      "Bethany, also rendered Bethania, was a Moravian mission church and school on St. John.",
    topographicNotes:
      "It stood about three-quarters of a mile due east of Cruz Bay in the Cruz Bay Quarter.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "beverhoutberg-stj",
    baseName: "Beverhoutberg",
    fullName: "Estate Beverhoutberg",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    historicalSummary:
      "Beverhoutberg on St. John refers both to an old estate on the summit of a hill and to an estate tract southwest of Adrian.",
    topographicNotes:
      "One site stands on a 545-foot hill south of Susannaberg, while another estate of the same name lies about one-quarter mile southwest of Adrian.",
    cartographicNotes:
      "The estate took its name from Beverhoutberg hill, itself associated with John von Beverhout, an early militia captain and planter.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "contant-stj",
    baseName: "Contant",
    fullName: "Estate Contant",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    historicalSummary:
      "Contant is a St. John estate positioned on the brow of a hill south of Enighed Pond.",
    topographicNotes:
      "The estate lies about 200 yards from the west coast in the Cruz Bay Quarter.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "klein-caneel-stj",
    baseName: "Klein Caneel",
    fullName: "Estate Klein Caneel",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    historicalSummary:
      "Klein Caneel was a second estate acquired by the early colonist Duurloo on Durloe Bay.",
    topographicNotes:
      "Its name means Little Cinnamon and ties the estate directly to the Durloe Bay area.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "bodkin-stx",
    baseName: "Bodkin",
    fullName: "Estate Bodkin",
    island: "stx",
    quarter: "Northside A Quarter",
    historicalSummary:
      "Bodkin was a collection of St. Croix estates originally owned by Laurence Bodkin.",
    topographicNotes:
      "Bodkin Mill stood on Bodkin Hill about 100 yards south of the summit.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "butler-bay-stx",
    baseName: "Butler Bay",
    fullName: "Estate Butler Bay",
    island: "stx",
    quarter: "Northside A Quarter",
    historicalSummary:
      "Butler Bay is a St. Croix estate located south of the bay of the same name.",
    topographicNotes:
      "The tract belongs to the Northside A Quarter and is oriented directly to the coastal bay landscape.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "belvedere-stx",
    baseName: "Belvedere",
    fullName: "Estate Belvedere",
    island: "stx",
    quarter: "Northside B Quarter",
    historicalSummary:
      "Belvedere is a St. Croix estate located about one-half mile from the north coast in the Northside B Quarter.",
    topographicNotes:
      "Its setting places it inland from the north shore rather than directly on the coast.",
    tenureNotes:
      "Belvedere was later joined to Lavallee in 1851 to form the Rotha sugar plantation.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "bethesda-stt",
    baseName: "Bethesda",
    fullName: "Estate Bethesda",
    island: "stt",
    quarter: "Westend Quarter",
    historicalSummary:
      "Bethesda is an estate on St. Thomas located on the southeast side of the road northeast of Fortuna Estate and near Fortuna Hill.",
    topographicNotes:
      "The estate lies in the Westend Quarter not far from a summit rising to about 766 feet.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "botanybay-stt",
    baseName: "Botanybay",
    fullName: "Estate Botanybay",
    island: "stt",
    quarter: "Westend Quarter",
    aliases: ["Botany Bay"],
    historicalSummary:
      "Botanybay is an estate on St. Thomas situated on the east shore of Botany Bay.",
    topographicNotes:
      "It is noted historically as a banana plantation closely tied to the bay shoreline.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "dorothea-stt",
    baseName: "Dorothea",
    fullName: "Estate Dorothea",
    island: "stt",
    quarter: "Little Northside Quarter",
    historicalSummary:
      "Dorothea is an estate on St. Thomas located about three-quarters of a mile south of Dorothea Bay.",
    topographicNotes:
      "The estate is situated on Northside Road within the Little Northside Quarter.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "altona-stt",
    baseName: "Altona",
    fullName: "Estate Altona",
    island: "stt",
    quarter: "Southside Quarter",
    historicalSummary:
      "Altona is an estate on St. Thomas adjoining the western suburbs of St. Thomas City.",
    topographicNotes:
      "Its location places it in the Southside Quarter near the urban edge of Charlotte Amalie.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "bethany-stj",
    baseName: "Bethany",
    fullName: "Estate Bethany",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    aliases: ["Bethania"],
    historicalSummary:
      "Bethany, also rendered Bethania, was a Moravian mission church and school on St. John.",
    topographicNotes:
      "It stood about three-quarters of a mile due east of Cruz Bay in the Cruz Bay Quarter.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "beverhoutberg-stj",
    baseName: "Beverhoutberg",
    fullName: "Estate Beverhoutberg",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    historicalSummary:
      "Beverhoutberg on St. John refers both to an old estate on the summit of a hill and to an estate tract southwest of Adrian.",
    topographicNotes:
      "One site stands on a 545-foot hill south of Susannaberg, while another estate of the same name lies about one-quarter mile southwest of Adrian.",
    cartographicNotes:
      "The estate took its name from Beverhoutberg hill, itself associated with John von Beverhout, an early militia captain and planter.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "contant-stj",
    baseName: "Contant",
    fullName: "Estate Contant",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    historicalSummary:
      "Contant is a St. John estate positioned on the brow of a hill south of Enighed Pond.",
    topographicNotes:
      "The estate lies about 200 yards from the west coast in the Cruz Bay Quarter.",
    sources: ["User-provided estate notes"],
  },
  {
    slug: "klein-caneel-stj",
    baseName: "Klein Caneel",
    fullName: "Estate Klein Caneel",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    historicalSummary:
      "Klein Caneel was a second estate acquired by the early colonist Duurloo on Durloe Bay.",
    topographicNotes:
      "Its name means Little Cinnamon and ties the estate directly to the Durloe Bay area.",
    sources: ["User-provided estate notes"],
  },

  {
    slug: "hope-stt",
    baseName: "Hope",
    island: "stt",
    quarter: "Westend Quarter",
    historicalSummary:
      "Hope is a historic estate in the Westend Quarter of St. Thomas.",
    topographicNotes:
      "It belongs to the western estate belt of St. Thomas and should be read within the ridge-and-bay geography of that district.",
    sources: ["Quarter registry"],
  },
  {
    slug: "perseverance-stt",
    baseName: "Perseverance",
    island: "stt",
    quarter: "Westend Quarter",
    historicalSummary:
      "Perseverance is a historic estate in the Westend Quarter of St. Thomas.",
    topographicNotes:
      "Its estate geography belongs to the western St. Thomas district associated with upland roads, bays, and plantation-era divisions.",
    sources: ["Quarter registry"],
  },
  {
    slug: "cabrite-stt",
    baseName: "Cabrite",
    island: "stt",
    quarter: "Southside Quarter",
    historicalSummary:
      "Cabrite is a historic St. Thomas estate in the Southside Quarter.",
    topographicNotes:
      "Its landscape belongs to the southside estate system outside the Charlotte Amalie basin.",
    sources: ["Quarter registry"],
  },
  {
    slug: "mosquito-bay-stt",
    baseName: "Mosquito Bay",
    island: "stt",
    quarter: "Southside Quarter",
    historicalSummary:
      "Mosquito Bay is a historic estate of St. Thomas in the Southside Quarter.",
    topographicNotes:
      "Its geography is associated with the southern shore and bay-oriented estate framework.",
    sources: ["Quarter registry"],
  },
  {
    slug: "lerkenlund-stt",
    baseName: "Lerkenlund",
    island: "stt",
    quarter: "Great Northside Quarter",
    historicalSummary:
      "Lerkenlund is a historic St. Thomas estate in the Great Northside Quarter.",
    topographicNotes:
      "It belongs to the high northside estate landscape above the island’s northern bays.",
    sources: ["Quarter registry"],
  },
  {
    slug: "lovenlund-stt",
    baseName: "Lovenlund",
    island: "stt",
    quarter: "Great Northside Quarter",
    historicalSummary:
      "Lovenlund is a historic St. Thomas estate in the Great Northside Quarter.",
    topographicNotes:
      "Its estate setting is part of the elevated northside terrain overlooking the northern coast.",
    sources: ["Quarter registry"],
  },
  {
    slug: "mandal-stt",
    baseName: "Mandal",
    island: "stt",
    quarter: "Great Northside Quarter",
    historicalSummary:
      "Mandal is a historic St. Thomas estate in the Great Northside Quarter.",
    topographicNotes:
      "The estate belongs to the northside ridge and valley system of central St. Thomas.",
    sources: ["Quarter registry"],
  },
  {
    slug: "charlotte-amalia-stt",
    baseName: "Charlotte Amalia",
    island: "stt",
    quarter: "New (Prince George) Quarter",
    aliases: ["Amalienborg"],
    historicalSummary:
      "Charlotte Amalia is the principal historic urban estate division of St. Thomas and forms part of the New (Prince George) Quarter framework.",
    cartographicNotes:
      "The name is deeply tied to the Danish administrative and urban history of St. Thomas, with Amalienborg used in related historical references.",
    topographicNotes:
      "Its geography centers on the harbor basin and surrounding slopes that shaped the main town.",
    sources: ["User-provided estate notes", "Quarter registry"],
  },
  {
    slug: "donoe-stt",
    baseName: "Donoe",
    island: "stt",
    quarter: "New (Prince George) Quarter",
    historicalSummary:
      "Donoe is a historic estate in the New (Prince George) Quarter of St. Thomas.",
    topographicNotes:
      "Its estate geography belongs to the eastern interior corridor beyond the harbor basin.",
    sources: ["Quarter registry"],
  },
  {
    slug: "bolongo-stt",
    baseName: "Bolongo",
    island: "stt",
    quarter: "French Bay Quarter",
    historicalSummary: "Bolongo is a St. Thomas estate in French Bay Quarter.",
    topographicNotes:
      "Its landscape is part of the south shore bay system east of central Charlotte Amalie.",
    sources: ["Quarter registry"],
  },
  {
    slug: "bovoni-stt",
    baseName: "Bovoni",
    island: "stt",
    quarter: "French Bay Quarter",
    historicalSummary:
      "Bovoni is a historic St. Thomas estate in French Bay Quarter.",
    topographicNotes:
      "Its setting lies in the southeastern basin and bay country of St. Thomas.",
    sources: ["Quarter registry"],
  },
  {
    slug: "stalley-stt",
    baseName: "Stalley",
    island: "stt",
    quarter: "French Bay Quarter",
    historicalSummary:
      "Stalley is a historic St. Thomas estate in French Bay Quarter.",
    topographicNotes:
      "It belongs to the southern estate district associated with French Bay and adjacent interior slopes.",
    sources: ["Quarter registry"],
  },
  {
    slug: "frydendal-stt",
    baseName: "Frydendal",
    island: "stt",
    quarter: "Eastend Quarter",
    historicalSummary:
      "Frydendal is a historic estate in the Eastend Quarter of St. Thomas.",
    topographicNotes:
      "Its estate geography belongs to the eastern district of bays, ridges, and coastal approaches.",
    sources: ["Quarter registry"],
  },
  {
    slug: "benner-stt",
    baseName: "Benner",
    island: "stt",
    quarter: "Redhook Quarter",
    historicalSummary:
      "Benner is a historic estate of St. Thomas in Redhook Quarter.",
    topographicNotes:
      "Its setting belongs to the eastern peninsula and bay network leading toward Red Hook.",
    sources: ["Quarter registry"],
  },
  {
    slug: "mariendal-stt",
    baseName: "Mariendal",
    island: "stt",
    quarter: "Redhook Quarter",
    historicalSummary:
      "Mariendal is a historic St. Thomas estate in Redhook Quarter.",
    topographicNotes:
      "It forms part of the eastern estate district shaped by bays, ridges, and peninsular road connections.",
    sources: ["Quarter registry"],
  },
  {
    slug: "nazareth-stt",
    baseName: "Nazareth",
    island: "stt",
    quarter: "Redhook Quarter",
    historicalSummary:
      "Nazareth is a historic estate in the Redhook Quarter of St. Thomas.",
    topographicNotes:
      "Its estate geography lies in the eastern bay-and-ridge landscape of St. Thomas.",
    sources: ["Quarter registry"],
  },
  {
    slug: "water-island-stt",
    baseName: "Water Island",
    island: "stt",
    quarter: "Water Island Quarter",
    aliases: ["Waterisland"],
    historicalSummary:
      "Water Island is identified in your quarter registry as part of the broader historic cadastral structure associated with St. Thomas.",
    topographicNotes:
      "Its geography is separate from the main island and should be treated as an insular estate district of its own.",
    sources: ["Quarter registry"],
  },

  {
    slug: "bethany-stj",
    baseName: "Bethany",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    aliases: ["Bethania"],
    historicalSummary:
      "Bethany, also rendered as Bethania, was a Moravian mission church and school located about three-quarters of a mile due east of Cruz Bay on St. John.",
    topographicNotes:
      "Its setting places it within the inland Cruz Bay quarter landscape just beyond the harbor settlement.",
    cartographicNotes:
      "The estate is associated with the early Moravian religious and educational footprint on St. John.",
    sources: ["User-provided estate notes"],
  },

  {
    slug: "contant-stj",
    baseName: "Contant",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    historicalSummary:
      "Contant was a St. John estate positioned on the brow of a hill about 200 yards from the west coast and south of Enighed Pond.",
    topographicNotes:
      "Its estate geography combines elevated brow land, pond-adjacent terrain, and proximity to the western shoreline.",
    sources: ["User-provided estate notes"],
  },

  {
    slug: "durloe-stj",
    baseName: "Durloe",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    aliases: ["Duurloo"],
    historicalSummary:
      "Durloe was a St. John estate in the Cruz Bay Quarter associated with early colonial landholding around Durloe Bay.",
    topographicNotes:
      "Its estate geography belongs to the bay-facing western and northwestern district of St. John near the Cruz Bay side.",
    cartographicNotes:
      "The name also appears in early colonial spelling forms such as Duurloo.",
    sources: ["Quarter registry", "User-provided estate notes"],
  },
  {
    slug: "susannaberg-stj",
    baseName: "Susannaberg",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    historicalSummary:
      "Susannaberg was a St. John estate in the Cruz Bay Quarter and served as a geographic reference point for neighboring upland estates such as Beverhoutberg.",
    topographicNotes:
      "Its setting is associated with hilly interior ground above the Cruz Bay side of the island.",
    sources: ["Quarter registry", "User-provided estate notes"],
  },
  {
    slug: "america-hill-stj",
    baseName: "America Hill",
    island: "stj",
    quarter: "Maho Quarter",
    historicalSummary:
      "America Hill was a St. John estate-place in the Maho Quarter associated with the north shore mountain and ridge system.",
    topographicNotes:
      "Its geography is defined by elevated north-shore terrain overlooking the Maho district.",
    sources: ["Quarter registry"],
  },
  {
    slug: "annaberg-stj",
    baseName: "Annaberg",
    island: "stj",
    quarter: "Maho Quarter",
    historicalSummary:
      "Annaberg on St. John was a major estate in the Maho Quarter associated with the island’s north shore plantation landscape.",
    topographicNotes:
      "Its setting belongs to the steep coastal and ridge terrain of the Maho and north shore district.",
    cartographicNotes:
      "The name is one of the most prominent surviving plantation place names on St. John.",
    sources: ["Quarter registry"],
  },
  {
    slug: "cinnamon-bay-stj",
    baseName: "Cinnamon Bay",
    island: "stj",
    quarter: "Maho Quarter",
    historicalSummary:
      "Cinnamon Bay was a St. John estate in the Maho Quarter centered on the famous north shore bay and its adjoining plantation lands.",
    topographicNotes:
      "Its estate geography combines beach frontage, low coastal plain, and steep rising interior slopes.",
    sources: ["Quarter registry"],
  },
  {
    slug: "maho-bay-stj",
    baseName: "Maho Bay",
    island: "stj",
    quarter: "Maho Quarter",
    aliases: ["Mahobay"],
    historicalSummary:
      "Maho Bay was a St. John estate-place in the Maho Quarter associated with the north shore bay and nearby plantation terrain.",
    topographicNotes:
      "Its landform is defined by bay frontage backed by steep green slopes and interior ridges.",
    sources: ["Quarter registry"],
  },
  {
    slug: "rustenberg-stj",
    baseName: "Rustenberg",
    island: "stj",
    quarter: "Maho Quarter",
    historicalSummary:
      "Rustenberg was a St. John estate in the Maho Quarter associated with elevated north-shore plantation ground.",
    topographicNotes:
      "Its geography belongs to the hill-and-ridge system above the north shore bays.",
    sources: ["Quarter registry"],
  },
  {
    slug: "hope-stj",
    baseName: "Hope",
    island: "stj",
    quarter: "Reef Bay Quarter",
    historicalSummary:
      "Hope was a St. John estate in the Reef Bay Quarter associated with the south-shore estate framework descending toward Reef Bay.",
    topographicNotes:
      "Its setting belongs to valley-and-bay terrain on the south side of the island.",
    sources: ["Quarter registry"],
  },
  {
    slug: "molendal-stj",
    baseName: "Molendal",
    island: "stj",
    quarter: "Reef Bay Quarter",
    historicalSummary:
      "Molendal was a St. John estate in the Reef Bay Quarter tied to the south-shore plantation landscape.",
    topographicNotes:
      "Its geography belongs to the descending valley system that opens toward Reef Bay.",
    sources: ["Quarter registry"],
  },
  {
    slug: "seeven-stj",
    baseName: "Seeven",
    island: "stj",
    quarter: "Reef Bay Quarter",
    aliases: ["Sieben"],
    historicalSummary:
      "Seeven, also rendered as Sieben, was a St. John estate in the Reef Bay Quarter associated with the inland-to-south-shore estate corridor.",
    topographicNotes:
      "Its estate geography is tied to the ridge and valley system draining toward Reef Bay.",
    sources: ["Quarter registry"],
  },
  {
    slug: "johns-folly-stj",
    baseName: "John's Folly",
    island: "stj",
    quarter: "Coral Bay Quarter",
    aliases: ["Johns Folly"],
    historicalSummary:
      "John's Folly was a St. John estate in the Coral Bay Quarter associated with the eastern and southeastern side of the island.",
    topographicNotes:
      "Its geography belongs to the steep coastal slopes and bay-facing terrain of the Coral Bay district.",
    sources: ["Quarter registry"],
  },
  {
    slug: "mandal-stj",
    baseName: "Mandal",
    island: "stj",
    quarter: "Coral Bay Quarter",
    historicalSummary:
      "Mandal was a St. John estate in the Coral Bay Quarter tied to the interior-eastern estate landscape.",
    topographicNotes:
      "Its landform belongs to the broken hills and descending valleys of the Coral Bay side.",
    sources: ["Quarter registry"],
  },
  {
    slug: "oostende-stj",
    baseName: "Oostende",
    island: "stj",
    quarter: "Eastend Quarter",
    historicalSummary:
      "Oostende was a St. John estate in the Eastend Quarter associated with the island’s far eastern cadastral district.",
    topographicNotes:
      "Its geography belongs to the rugged eastern end of St. John.",
    cartographicNotes:
      "The name preserves the older Danish naming pattern for the East End district.",
    sources: ["Quarter registry"],
  },
  {
    slug: "eastend-stj",
    baseName: "Eastend",
    island: "stj",
    quarter: "Eastend Quarter",
    aliases: ["East End"],
    historicalSummary:
      "Eastend was a St. John estate-place in the Eastend Quarter associated with the far eastern section of the island.",
    topographicNotes:
      "Its setting belongs to the rugged, exposed terrain of eastern St. John.",
    sources: ["Quarter registry"],
  },
  {
    slug: "hammer-farm-stj",
    baseName: "Hammer Farm",
    island: "stj",
    quarter: "Cruz Bay Quarter",
    historicalSummary:
      "Hammer Farm is a historic St. John estate-place in the Cruz Bay Quarter associated with the inland ground south of Cinnamon Bay and near Catherineberg.",
    topographicNotes:
      "Its setting belongs to upland terrain between the north shore bays and the interior ridge routes of the Cruz Bay side.",
    sources: ["Quarter registry"],
  },
  {
    slug: "caledonia-stx",
    baseName: "Caledonia",
    island: "stx",
    quarter: "Northside A Quarter",
    historicalSummary:
      "Caledonia is a historic St. Croix estate in Northside A Quarter associated with the upland northwestern estate belt.",
    topographicNotes:
      "Its geography belongs to the rugged hill-and-valley system of the Northside A district.",
    sources: ["Quarter registry"],
  },
  {
    slug: "crequis-stx",
    baseName: "Crequis",
    island: "stx",
    quarter: "Northside A Quarter",
    historicalSummary:
      "Crequis is a historic St. Croix estate in Northside A Quarter associated with the upper valley and ridge landscape of the northwestern side of the island.",
    topographicNotes:
      "Its estate geography belongs to a broken upland terrain of valleys, slopes, and watershed ridges.",
    sources: ["Quarter registry"],
  },
  {
    slug: "oxford-stx",
    baseName: "Oxford",
    island: "stx",
    quarter: "Northside A Quarter",
    historicalSummary:
      "Oxford is a historic St. Croix estate in Northside A Quarter associated with the northwestern plantation landscape.",
    topographicNotes:
      "Its setting belongs to the hilly northside district tied to interior roads, estate valleys, and steep slopes.",
    sources: ["Quarter registry"],
  },
  {
    slug: "punch-stx",
    baseName: "Punch",
    island: "stx",
    quarter: "Northside A Quarter",
    historicalSummary:
      "Punch is a historic St. Croix estate in Northside A Quarter.",
    topographicNotes:
      "Its geography belongs to the northwestern upland estate system of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "cane-bay-stx",
    baseName: "Cane Bay",
    island: "stx",
    quarter: "Northside B Quarter",
    aliases: ["Canebay"],
    historicalSummary:
      "Cane Bay is a historic St. Croix estate in Northside B Quarter associated with the north coast and adjoining upland plantation terrain.",
    topographicNotes:
      "Its setting joins coastal frontage with the steep hills and valleys rising inland from the north shore.",
    sources: ["Quarter registry"],
  },
  {
    slug: "little-fountain-stx",
    baseName: "Little Fountain",
    island: "stx",
    quarter: "Northside B Quarter",
    historicalSummary:
      "Little Fountain is a historic St. Croix estate in Northside B Quarter.",
    topographicNotes:
      "Its estate geography belongs to the enclosed valleys and steep upland relief of the northside interior.",
    sources: ["Quarter registry"],
  },
  {
    slug: "northstar-stx",
    baseName: "Northstar",
    island: "stx",
    quarter: "Northside B Quarter",
    historicalSummary:
      "Northstar is a historic St. Croix estate in Northside B Quarter.",
    topographicNotes:
      "Its geography belongs to the northside ridge-and-valley estate system inland from the coast.",
    sources: ["Quarter registry"],
  },
  {
    slug: "brook-stx",
    baseName: "Brook",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Brook is a historic St. Croix estate in the Westend Quarter.",
    topographicNotes:
      "Its setting belongs to the western estate belt associated with Frederiksted-side plantation lands and interior road connections.",
    sources: ["Quarter registry"],
  },
  {
    slug: "campo-rico-stx",
    baseName: "Campo Rico",
    island: "stx",
    quarter: "Westend Quarter",
    aliases: ["Camporico"],
    historicalSummary:
      "Campo Rico is a historic St. Croix estate in the Westend Quarter.",
    topographicNotes:
      "Its geography belongs to the western plantation district of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "cane-stx",
    baseName: "Cane",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Cane is a historic St. Croix estate in the Westend Quarter.",
    topographicNotes:
      "Its setting belongs to the western estate district of interior plains, road corridors, and plantation-era divisions.",
    sources: ["Quarter registry"],
  },
  {
    slug: "lower-concordia-stx",
    baseName: "Lower Concordia",
    island: "stx",
    quarter: "Westend Quarter",
    aliases: ["Concordia Westend"],
    historicalSummary:
      "Lower Concordia is a historic St. Croix estate in the Westend Quarter and should be distinguished from Concordia in Prince Quarter.",
    topographicNotes:
      "Its geography belongs to the western agricultural district tied to Frederiksted-side estate ground.",
    sources: ["Quarter registry"],
  },
  {
    slug: "hannahs-rest-stx",
    baseName: "Hannah's Rest",
    island: "stx",
    quarter: "Westend Quarter",
    aliases: ["Hannahs Rest"],
    historicalSummary:
      "Hannah's Rest is a historic St. Croix estate in the Westend Quarter.",
    topographicNotes:
      "Its setting belongs to the western estate district associated with plantation-era land divisions and coastal-inland connections.",
    sources: ["Quarter registry"],
  },
  {
    slug: "jolly-hill-stx",
    baseName: "Jolly Hill",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Jolly Hill is a historic St. Croix estate in the Westend Quarter.",
    topographicNotes:
      "Its geography belongs to the western upland and hill-associated estate terrain.",
    sources: ["Quarter registry"],
  },
  {
    slug: "lagrange-stx",
    baseName: "Lagrange",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Lagrange is a historic St. Croix estate in the Westend Quarter.",
    topographicNotes:
      "Its setting belongs to the western agricultural district of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "little-grange-stx",
    baseName: "Little Grange",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Little Grange is a historic St. Croix estate in the Westend Quarter.",
    topographicNotes:
      "Its geography belongs to the western estate landscape associated with neighboring grange and plantation tracts.",
    sources: ["Quarter registry"],
  },
  {
    slug: "ruan-bay-stx",
    baseName: "Ruan Bay",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Ruan Bay is a historic St. Croix estate in the Westend Quarter.",
    topographicNotes:
      "Its setting is tied to bay-oriented western estate geography.",
    sources: ["Quarter registry"],
  },
  {
    slug: "rowans-stx",
    baseName: "Rowans",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Rowans is a historic St. Croix estate in the Westend Quarter.",
    topographicNotes:
      "Its estate geography belongs to the western plantation belt of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "smithfield-stx",
    baseName: "Smithfield",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Smithfield is a historic St. Croix estate in the Westend Quarter.",
    topographicNotes:
      "Its geography belongs to the western coastal and inland plantation system near Westend Bay and neighboring estates.",
    sources: ["Quarter registry"],
  },
  {
    slug: "stony-ground-stx",
    baseName: "Stony Ground",
    island: "stx",
    quarter: "Westend Quarter",
    aliases: ["Stonyground"],
    historicalSummary:
      "Stony Ground is a historic St. Croix estate in the Westend Quarter.",
    topographicNotes:
      "Its setting belongs to the western estate district of coastal plain and adjoining interior slopes.",
    sources: ["Quarter registry"],
  },
  {
    slug: "two-williams-stx",
    baseName: "Two Williams",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "Two Williams is a historic St. Croix estate in the Westend Quarter.",
    topographicNotes:
      "Its geography belongs to the western plantation landscape of Frederiksted-side St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "white-stx",
    baseName: "White",
    island: "stx",
    quarter: "Westend Quarter",
    historicalSummary:
      "White is a historic St. Croix estate in the Westend Quarter.",
    topographicNotes:
      "Its setting belongs to the western estate system of plantation fields and adjoining roads.",
    sources: ["Quarter registry"],
  },
  {
    slug: "williams-delight-stx",
    baseName: "Williams Delight",
    island: "stx",
    quarter: "Westend Quarter",
    aliases: ["William's Delight"],
    historicalSummary:
      "Williams Delight is a historic St. Croix estate in the Westend Quarter.",
    topographicNotes:
      "Its geography belongs to the western estate belt associated with Frederiksted-side settlement and agricultural land.",
    sources: ["Quarter registry"],
  },
  {
    slug: "bettys-hope-stx",
    baseName: "Betty's Hope",
    island: "stx",
    quarter: "Prince Quarter",
    aliases: ["Bettys Hope"],
    historicalSummary:
      "Betty's Hope is a historic St. Croix estate in the Prince Quarter.",
    topographicNotes:
      "Its setting belongs to the central-southern agricultural belt of the Prince Quarter.",
    sources: ["Quarter registry"],
  },
  {
    slug: "clermont-stx",
    baseName: "Clermont",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Clermont is a historic St. Croix estate in the Prince Quarter.",
    topographicNotes:
      "Its estate geography belongs to the central plantation landscape of the Prince Quarter.",
    sources: ["Quarter registry"],
  },
  {
    slug: "cooper-stx",
    baseName: "Cooper",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Cooper is a historic St. Croix estate in the Prince Quarter.",
    topographicNotes:
      "Its setting belongs to the central agricultural district of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "montpellier-stx",
    baseName: "Montpellier",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Montpellier is a historic St. Croix estate in the Prince Quarter.",
    topographicNotes:
      "Its estate geography belongs to the central-southern plantation corridor of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "envy-stx",
    baseName: "Envy",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Envy is a historic St. Croix estate in the Prince Quarter.",
    topographicNotes:
      "Its geography belongs to the plantation-era interior estate belt of the Prince Quarter.",
    sources: ["Quarter registry"],
  },
  {
    slug: "fox-stx",
    baseName: "Fox",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Fox is a historic St. Croix estate in the Prince Quarter.",
    topographicNotes:
      "Its setting belongs to the central agricultural district and road-linked plantation terrain of the Prince Quarter.",
    sources: ["Quarter registry"],
  },
  {
    slug: "golden-grove-stx",
    baseName: "Golden Grove",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Golden Grove is a historic St. Croix estate in the Prince Quarter.",
    topographicNotes:
      "Its estate geography belongs to the central plantation landscape of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "mint-stx",
    baseName: "Mint",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Mint is a historic St. Croix estate in the Prince Quarter.",
    topographicNotes:
      "Its setting belongs to the central inland estate belt tied to the headwaters and roads of the Prince Quarter.",
    sources: ["Quarter registry"],
  },
  {
    slug: "negro-bay-stx",
    baseName: "Negro Bay",
    island: "stx",
    quarter: "Prince Quarter",
    aliases: ["Negrobay"],
    historicalSummary:
      "Negro Bay is a historic St. Croix estate in the Prince Quarter.",
    topographicNotes:
      "Its geography belongs to the south-facing plantation corridor associated with bay-oriented tracts of the Prince Quarter.",
    sources: ["Quarter registry"],
  },
  {
    slug: "old-pye-stx",
    baseName: "Old Pye",
    island: "stx",
    quarter: "Prince Quarter",
    historicalSummary:
      "Old Pye is a historic St. Croix estate in the Prince Quarter.",
    topographicNotes:
      "Its setting belongs to the interior plantation landscape of central St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "st-george-stx",
    baseName: "St. George",
    island: "stx",
    quarter: "Prince Quarter",
    aliases: ["St George"],
    historicalSummary:
      "St. George is a historic St. Croix estate in the Prince Quarter.",
    topographicNotes:
      "Its estate geography belongs to the central plantation belt associated with neighboring Prince Quarter estates.",
    sources: ["Quarter registry"],
  },
  {
    slug: "water-ground-stx",
    baseName: "Water Ground",
    island: "stx",
    quarter: "Prince Quarter",
    aliases: ["Waterground"],
    historicalSummary:
      "Water Ground is a historic St. Croix estate in the Prince Quarter.",
    topographicNotes:
      "Its setting belongs to the central-southern estate system of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "atkins-stx",
    baseName: "Atkins",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    historicalSummary:
      "Atkins is a historic St. Croix estate in the Queen (Dronning) Quarter.",
    topographicNotes:
      "Its geography belongs to the north-central plantation belt associated with the Queen Quarter.",
    sources: ["Quarter registry"],
  },
  {
    slug: "barren-spot-stx",
    baseName: "Barren Spot",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    aliases: ["Barrenspot", "Barren Spot West", "Barren Spot East"],
    historicalSummary:
      "Barren Spot is a historic St. Croix estate in the Queen (Dronning) Quarter, with east and west tract variants reflected in later naming.",
    topographicNotes:
      "Its estate geography belongs to the north-central plains and adjoining settlement landscape of the Queen Quarter.",
    sources: ["Quarter registry"],
  },
  {
    slug: "cassava-garden-stx",
    baseName: "Cassava Garden",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    historicalSummary:
      "Cassava Garden is a historic St. Croix estate in the Queen (Dronning) Quarter.",
    topographicNotes:
      "Its setting belongs to the north-central agricultural estate landscape of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "castle-coakley-stx",
    baseName: "Castle Coakley",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    historicalSummary:
      "Castle Coakley is a historic St. Croix estate in the Queen (Dronning) Quarter.",
    topographicNotes:
      "Its geography belongs to the north-central estate belt between the Christiansted side and inland plains.",
    sources: ["Quarter registry"],
  },
  {
    slug: "glynn-stx",
    baseName: "Glynn",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    historicalSummary:
      "Glynn is a historic St. Croix estate in the Queen (Dronning) Quarter.",
    topographicNotes:
      "Its setting belongs to the north-central estate framework of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "humbug-stx",
    baseName: "Humbug",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    historicalSummary:
      "Humbug is a historic St. Croix estate in the Queen (Dronning) Quarter.",
    topographicNotes:
      "Its estate geography belongs to the inland north-central district of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "lime-tree-stx",
    baseName: "Lime Tree",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    aliases: ["Limetree"],
    historicalSummary:
      "Lime Tree is a historic St. Croix estate in the Queen (Dronning) Quarter.",
    topographicNotes:
      "Its setting belongs to the north-central plantation district of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "pearl-stx",
    baseName: "Pearl",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    historicalSummary:
      "Pearl is a historic St. Croix estate in the Queen (Dronning) Quarter.",
    topographicNotes:
      "Its estate geography belongs to the north-central plains and adjoining ridge landscape of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "peters-rest-stx",
    baseName: "Peter's Rest",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    aliases: ["Peters Rest"],
    historicalSummary:
      "Peter's Rest is a historic St. Croix estate in the Queen (Dronning) Quarter.",
    topographicNotes:
      "Its setting belongs to the Christiansted-side north-central estate belt of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "st-john-stx",
    baseName: "St. John",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    aliases: ["St John"],
    historicalSummary:
      "St. John is a historic St. Croix estate in the Queen (Dronning) Quarter.",
    topographicNotes:
      "Its estate geography belongs to the north-central Christiansted-side district of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "sion-hill-stx",
    baseName: "Sion Hill",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    historicalSummary:
      "Sion Hill is a historic St. Croix estate-place in the Queen (Dronning) Quarter associated with the hill landscape north of Centerline Road.",
    topographicNotes:
      "Its setting belongs to the paired hill-and-plain geography associated with Sion Farm and adjacent estates.",
    sources: ["Quarter registry"],
  },
  {
    slug: "strawberry-stx",
    baseName: "Strawberry",
    island: "stx",
    quarter: "Queen (Dronning) Quarter",
    historicalSummary:
      "Strawberry is a historic St. Croix estate in the Queen (Dronning) Quarter.",
    topographicNotes:
      "Its geography belongs to the north-central estate framework of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "barnspool-stx",
    baseName: "Barnspool",
    island: "stx",
    quarter: "King Quarter",
    aliases: ["Barn Spool"],
    historicalSummary:
      "Barnspool is a historic St. Croix estate in the King Quarter.",
    topographicNotes:
      "Its estate geography belongs to the Kingshill-side plantation district of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "blessing-stx",
    baseName: "Blessing",
    island: "stx",
    quarter: "King Quarter",
    historicalSummary:
      "Blessing is a historic St. Croix estate in the King Quarter.",
    topographicNotes:
      "Its setting belongs to the Kingshill-side interior estate belt.",
    sources: ["Quarter registry"],
  },
  {
    slug: "clifton-hill-stx",
    baseName: "Clifton Hill",
    island: "stx",
    quarter: "King Quarter",
    historicalSummary:
      "Clifton Hill is a historic St. Croix estate in the King Quarter.",
    topographicNotes:
      "Its geography belongs to the upland and basin landscape of the Kingshill district.",
    sources: ["Quarter registry"],
  },
  {
    slug: "lebanon-stx",
    baseName: "Lebanon",
    island: "stx",
    quarter: "King Quarter",
    historicalSummary:
      "Lebanon is a historic St. Croix estate in the King Quarter.",
    topographicNotes:
      "Its estate geography belongs to the Kingshill-side basin and ridge system of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "midland-stx",
    baseName: "Midland",
    island: "stx",
    quarter: "King Quarter",
    historicalSummary:
      "Midland is a historic St. Croix estate in the King Quarter.",
    topographicNotes:
      "Its setting belongs to the interior estate corridor associated with the Kingshill district.",
    sources: ["Quarter registry"],
  },
  {
    slug: "mon-bijou-stx",
    baseName: "Mon Bijou",
    island: "stx",
    quarter: "King Quarter",
    historicalSummary:
      "Mon Bijou is a historic St. Croix estate in the King Quarter.",
    topographicNotes:
      "Its geography belongs to the Kingshill-side interior plantation landscape.",
    sources: ["Quarter registry"],
  },
  {
    slug: "spanish-town-stx",
    baseName: "Spanish Town",
    island: "stx",
    quarter: "King Quarter",
    aliases: ["Spanishtown"],
    historicalSummary:
      "Spanish Town is a historic St. Croix estate-place in the King Quarter.",
    topographicNotes:
      "Its setting belongs to the Kingshill district and its adjoining estate belt.",
    sources: ["Quarter registry"],
  },
  {
    slug: "annas-hope-stx",
    baseName: "Anna's Hope",
    island: "stx",
    quarter: "Company Quarter",
    aliases: ["Annas Hope", "Anna S Hope"],
    historicalSummary:
      "Anna's Hope is a historic St. Croix estate in the Company Quarter.",
    topographicNotes:
      "Its geography belongs to the Christiansted-side estate framework of the Company Quarter.",
    sources: ["Quarter registry"],
  },
  {
    slug: "cornhill-stx",
    baseName: "Cornhill",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Cornhill is a historic St. Croix estate in the Company Quarter.",
    topographicNotes:
      "Its setting belongs to the eastern Christiansted-side estate landscape.",
    sources: ["Quarter registry"],
  },
  {
    slug: "diamond-keturah-stx",
    baseName: "Diamond Keturah",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Diamond Keturah is a historic St. Croix estate in the Company Quarter.",
    topographicNotes:
      "Its geography belongs to the Christiansted-side plantation district of eastern St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "grange-stx",
    baseName: "Grange",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Grange is a historic St. Croix estate in the Company Quarter.",
    topographicNotes:
      "Its estate geography belongs to the eastern plantation landscape tied to the Company Quarter.",
    sources: ["Quarter registry"],
  },
  {
    slug: "hermon-hill-stx",
    baseName: "Hermon Hill",
    island: "stx",
    quarter: "Company Quarter",
    historicalSummary:
      "Hermon Hill is a historic St. Croix estate-place in the Company Quarter.",
    topographicNotes:
      "Its setting belongs to the eastern Christiansted-side hill and estate system.",
    sources: ["Quarter registry"],
  },
  {
    slug: "peters-farm-stx",
    baseName: "Peter's Farm",
    island: "stx",
    quarter: "Company Quarter",
    aliases: ["Peters Farm"],
    historicalSummary:
      "Peter's Farm is a historic St. Croix estate in the Company Quarter.",
    topographicNotes:
      "Its geography belongs to the Company Quarter estate belt near the Christiansted side of the island.",
    sources: ["Quarter registry"],
  },
  {
    slug: "beckmans-stx",
    baseName: "Beckman's",
    island: "stx",
    quarter: "Eastend A Quarter",
    aliases: ["Beckmans"],
    historicalSummary:
      "Beckman's is a historic St. Croix estate in Eastend A Quarter.",
    topographicNotes:
      "Its setting belongs to the East End hill-and-bay estate framework of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "carina-stx",
    baseName: "Carina",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Carina is a historic St. Croix estate in Eastend A Quarter.",
    topographicNotes:
      "Its geography belongs to the East End ridge, hill, and bay system.",
    sources: ["Quarter registry"],
  },
  {
    slug: "salmon-hill-stx",
    baseName: "Salmon Hill",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Salmon Hill is a historic St. Croix estate-place in Eastend A Quarter.",
    topographicNotes:
      "Its setting belongs to the elevated East End terrain of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "coakley-bay-stx",
    baseName: "Coakley Bay",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Coakley Bay is a historic St. Croix estate in Eastend A Quarter.",
    topographicNotes:
      "Its geography belongs to the East End bay-oriented estate district of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "endracht-stx",
    baseName: "Endracht",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Endracht is a historic St. Croix estate in Eastend A Quarter.",
    topographicNotes:
      "Its setting belongs to the East End estate system of bays, slopes, and plantation tracts.",
    sources: ["Quarter registry"],
  },
  {
    slug: "farrington-stx",
    baseName: "Farrington",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Farrington is a historic St. Croix estate in Eastend A Quarter.",
    topographicNotes:
      "Its estate geography belongs to the eastern plantation corridor of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "green-cay-stx",
    baseName: "Green Cay",
    island: "stx",
    quarter: "Eastend A Quarter",
    aliases: ["Greencay"],
    historicalSummary:
      "Green Cay is a historic St. Croix estate in Eastend A Quarter.",
    topographicNotes:
      "Its geography belongs to the East End coastal and near-coastal estate system.",
    sources: ["Quarter registry"],
  },
  {
    slug: "hartman-stx",
    baseName: "Hartman",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Hartman is a historic St. Croix estate in Eastend A Quarter.",
    topographicNotes:
      "Its setting belongs to the East End hill-and-plain estate landscape.",
    sources: ["Quarter registry"],
  },
  {
    slug: "punnett-stx",
    baseName: "Punnett",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Punnett is a historic St. Croix estate in Eastend A Quarter.",
    topographicNotes:
      "Its geography belongs to the eastern estate district of bays, hills, and plantation-era divisions.",
    sources: ["Quarter registry"],
  },
  {
    slug: "southgate-stx",
    baseName: "Southgate",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Southgate is a historic St. Croix estate in Eastend A Quarter.",
    topographicNotes:
      "Its setting belongs to the East End estate corridor of bays, low coastal plain, and interior plantation terrain.",
    sources: ["Quarter registry"],
  },
  {
    slug: "springs-stx",
    baseName: "Springs",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Springs is a historic St. Croix estate in Eastend A Quarter.",
    topographicNotes:
      "Its geography belongs to the East End estate district associated with slopes, drainage basins, and plantation-era divisions.",
    sources: ["Quarter registry"],
  },
  {
    slug: "tipperary-stx",
    baseName: "Tipperary",
    island: "stx",
    quarter: "Eastend A Quarter",
    historicalSummary:
      "Tipperary is a historic St. Croix estate in Eastend A Quarter.",
    topographicNotes:
      "Its setting belongs to the East End estate framework linked to nearby bays and inland ridges.",
    sources: ["Quarter registry"],
  },
  {
    slug: "seven-hills-stx",
    baseName: "Seven Hills",
    island: "stx",
    quarter: "Eastend A Quarter",
    aliases: ["Sevenhills"],
    historicalSummary:
      "Seven Hills is a historic St. Croix estate-place in Eastend A Quarter.",
    topographicNotes:
      "Its setting belongs to the elevated ridge system of the East End.",
    sources: ["Quarter registry"],
  },
  {
    slug: "old-coakley-bay-stx",
    baseName: "Old Coakley Bay",
    island: "stx",
    quarter: "Eastend B Quarter",
    historicalSummary:
      "Old Coakley Bay is a historic St. Croix estate in Eastend B Quarter.",
    topographicNotes:
      "Its geography belongs to the eastern bay-oriented estate framework of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "cotton-garden-stx",
    baseName: "Cotton Garden",
    island: "stx",
    quarter: "Eastend B Quarter",
    aliases: ["Cottongarden"],
    historicalSummary:
      "Cotton Garden is a historic St. Croix estate in Eastend B Quarter.",
    topographicNotes:
      "Its setting belongs to the eastern plantation landscape of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "hodge-stx",
    baseName: "Hodge",
    island: "stx",
    quarter: "Eastend B Quarter",
    historicalSummary:
      "Hodge is a historic St. Croix estate in Eastend B Quarter.",
    topographicNotes:
      "Its geography belongs to the eastern hill-and-glen district of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "carden-stx",
    baseName: "Carden",
    island: "stx",
    quarter: "Eastend B Quarter",
    historicalSummary:
      "Carden is a historic St. Croix estate in Eastend B Quarter.",
    topographicNotes:
      "Its geography belongs to the eastern estate belt of bays, ridges, and plantation-era tracts.",
    sources: ["Quarter registry"],
  },
  {
    slug: "carty-stx",
    baseName: "Carty",
    island: "stx",
    quarter: "Eastend B Quarter",
    historicalSummary:
      "Carty is a historic St. Croix estate in Eastend B Quarter.",
    topographicNotes:
      "Its setting belongs to the eastern estate corridor associated with coastal access and interior estate slopes.",
    sources: ["Quarter registry"],
  },
  {
    slug: "marys-fancy-stx",
    baseName: "Mary's Fancy",
    island: "stx",
    quarter: "Eastend B Quarter",
    aliases: ["Marys Fancy"],
    historicalSummary:
      "Mary's Fancy is a historic St. Croix estate in Eastend B Quarter.",
    topographicNotes:
      "Its estate geography belongs to the eastern plantation corridor of St. Croix.",
    sources: ["Quarter registry"],
  },
  {
    slug: "tague-bay-stx",
    baseName: "Tague Bay",
    island: "stx",
    quarter: "Eastend B Quarter",
    historicalSummary:
      "Tague Bay is a historic St. Croix estate in Eastend B Quarter.",
    topographicNotes:
      "Its setting belongs to the eastern bay and coastal estate system of St. Croix.",
    sources: ["Quarter registry"],
  },
];

export const ESTATE_HISTORY = buildEstateHistory(RAW_ESTATE_HISTORY);

export function findEstateHistory(
  baseName: string,
  islandInput: unknown
): EstateHistoryRecord | null {
  const island = normalizeIslandCode(islandInput);
  if (!island) return null;

  const target = normalizeEstateKey(baseName);

  const direct =
    ESTATE_HISTORY.find((record) => {
      if (record.island !== island) return false;
      return matchRecordByName(record, target);
    }) ?? null;

  if (direct) {
    return {
      ...direct,
      fullName: direct.fullName ?? `Estate ${direct.baseName}`,
      quarter:
        direct.quarter ?? inferQuarter(direct.baseName, island, direct.aliases),
    };
  }

  const inferredQuarter = inferQuarter(baseName, island);

  if (!inferredQuarter) return null;

  return {
    slug: `${normalizeEstateKey(baseName)}-${island}`,
    baseName,
    fullName: `Estate ${baseName}`,
    island,
    quarter: inferredQuarter,
    historicalSummary:
      "This estate is identified in the quarter registry and can be placed within the historic cadastral geography of the island, even though a longer narrative profile has not yet been added.",
    sources: ["Quarter registry"],
  };
}

export function findEstateHistoryByGeoid(
  geoid: string,
  fallbackBaseName?: string,
  fallbackIsland?: unknown
): EstateHistoryRecord | null {
  const normalizedGeoid = String(geoid ?? "").trim();

  if (!normalizedGeoid) {
    return null;
  }

  const direct =
    ESTATE_HISTORY.find(
      (record) =>
        record.geoid && String(record.geoid).trim() === normalizedGeoid
    ) ?? null;

  if (direct) {
    return {
      ...direct,
      fullName: direct.fullName ?? `Estate ${direct.baseName}`,
      quarter:
        direct.quarter ??
        inferQuarter(direct.baseName, direct.island, direct.aliases),
    };
  }

  if (fallbackBaseName && fallbackIsland) {
    return findEstateHistory(fallbackBaseName, fallbackIsland);
  }

  return null;
}

export function buildFallbackEstateHistory(args: {
  geoid?: string;
  baseName: string;
  fullName?: string;
  island: unknown;
  aliases?: string[];
}): EstateHistoryRecord | null {
  const island = normalizeIslandCode(args.island);
  if (!island) return null;

  const inferredQuarter = inferQuarter(args.baseName, island, args.aliases);

  return {
    slug: `${normalizeEstateKey(args.baseName)}-${island}`,
    geoid: args.geoid,
    baseName: args.baseName,
    fullName: args.fullName ?? `Estate ${args.baseName}`,
    island,
    quarter: inferredQuarter,
    historicalSummary:
      "This estate has polygon geography loaded into the explorer and has been placed into the historic cadastral structure of the island. A longer narrative profile can be added next.",
    topographicNotes:
      "The current record is being rendered from mapped estate geography and quarter inference.",
    sources: ["Estate polygon dataset", "Quarter registry"],
  };
}

function getAllQuarterEstateKeys() {
  return [
    ...Object.entries(STT_ESTATE_QUARTERS).map(([name, quarter]) => ({
      island: "stt" as const,
      name,
      quarter,
    })),
    ...Object.entries(STJ_ESTATE_QUARTERS).map(([name, quarter]) => ({
      island: "stj" as const,
      name,
      quarter,
    })),
    ...Object.entries(STX_ESTATE_QUARTERS).map(([name, quarter]) => ({
      island: "stx" as const,
      name,
      quarter,
    })),
  ];
}

function getCoveredEstateKeys() {
  const covered = new Set<string>();

  for (const record of ESTATE_HISTORY) {
    covered.add(`${record.island}:${normalizeEstateKey(record.baseName)}`);
    for (const alias of record.aliases ?? []) {
      covered.add(`${record.island}:${normalizeEstateKey(alias)}`);
    }
  }

  return covered;
}

export function listMissingEstateRecords() {
  const covered = getCoveredEstateKeys();

  return getAllQuarterEstateKeys().filter(({ island, name }) => {
    const key = `${island}:${normalizeEstateKey(name)}`;
    return !covered.has(key);
  });
}

export function listDuplicateEstateRecords() {
  const seen = new Map<string, EstateHistoryRecord[]>();

  for (const record of RAW_ESTATE_HISTORY) {
    const key = `${record.island}:${normalizeEstateKey(record.baseName)}`;
    const group = seen.get(key) ?? [];
    group.push(record);
    seen.set(key, group);
  }

  return Array.from(seen.entries())
    .filter(([, records]) => records.length > 1)
    .map(([key, records]) => ({
      key,
      records: records.map((record) => ({
        slug: record.slug,
        baseName: record.baseName,
        fullName: record.fullName,
        quarter: record.quarter,
      })),
    }));
}

if (process.env.NODE_ENV === "development") {
  console.log("=== DUPLICATES IN RAW_ESTATE_HISTORY ===");
  console.log(listDuplicateEstateRecords());

  console.log("=== MISSING ESTATE RECORDS ===");
  console.log(listMissingEstateRecords());
}
