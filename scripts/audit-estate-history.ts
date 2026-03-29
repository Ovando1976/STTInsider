import {
  listDuplicateEstateRecords,
  listMissingEstateRecords,
} from "@/lib/usvi/estate-history";

console.log("=== DUPLICATES IN RAW_ESTATE_HISTORY ===");
console.dir(listDuplicateEstateRecords(), { depth: null });

console.log("\n=== MISSING ESTATE RECORDS ===");
console.dir(listMissingEstateRecords(), { depth: null });
