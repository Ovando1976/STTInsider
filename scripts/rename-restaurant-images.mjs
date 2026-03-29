import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

function getArgValue(flag, fallback) {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  return fallback;
}

const SOURCE_DIR = path.resolve(getArgValue("--source", "public/images"));
const TARGET_DIR = path.resolve(
  getArgValue("--target", "public/images/restaurants")
);

const names = [
  "amalia-cafe",
  "and-xo-bistro",
  "beach-bar-at-emerald-beach",
  "beach-bar-and-grill-at-lindbergh-beach",
  "beni-iguanas-sushi-bar",
  "blue-11",
  "brooks-bar",
  "buddha-sushi",
  "burger-maxx",
  "cafe-amici",
  "caribbean-fish-market",
  "caribbean-saloon-steak",
  "carigas-island-cafe",
  "china-king",
  "coconuts-bar-grill",
  "cravin-crabs",
  "delly-deck",
  "dog-house-pub",
  "french-quarter-bistro",
  "frenchtown-deli",
  "gladys-cafe",
  "great-wall",
  "great-wall-chinese",
  "greengos",
  "hook-line-sinker",
  "ideal-roti",
  "iggies-oasis",
  "island-flavor",
  "island-time-pub-pizza",
  "magens-bay-cafe-pizzeria",
  "mafolie-restaurant",
  "margaritaville-restaurant",
  "oceana-multicuisine",
  "old-stone-farmhouse",
  "pangea-terra-table-farm-to-table",
  "paradise-point-bar-restaurant",
  "pesce-italian",
  "petit-pump-room",
  "pie-whole-pizza",
  "pita-express",
  "pizza-amore",
  "pizza-pi-floating-pizza-boat",
  "prime-at-paradise-point",
  "prime-at-paradise-point-steak",
  "rancho-latino",
  "raw-sushi-sake-bar",
  "rum-island-pub",
  "rum-shandy",
  "sabroso-restaurant",
  "sapphire-beach-bar",
  "secret-harbour-beach-resort",
  "senor-pizza",
  "side-street-pub",
  "sibs-mountain-bar-restaurant",
  "smoky-rooster",
  "smoking-rooster",
  "speedy-redemption",
  "stone-house-cafe",
  "stir-it-up",
  "stir-it-up-coffee",
  "sunset-grille-secret-harbour",
  "tap-and-still",
  "taphus-beer-house",
  "taphus-beer-house-brewery",
  "texas-pit",
  "thali-indian-grill",
  "the-box-bar",
  "the-dive-bar",
  "the-easterly",
  "the-green-house",
  "the-meat-up",
  "the-tuck-shop",
  "the-twisted-cork-cafe",
  "tickles-dockside-pub",
  "tickles-dockside-pub-and-virgin-islands-coffee-roasters",
  "virgin-islands-coffee-roasters-coffee",
];

const validExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Source directory not found: ${SOURCE_DIR}`);
  }

  fs.mkdirSync(TARGET_DIR, { recursive: true });

  const sourceFiles = fs
    .readdirSync(SOURCE_DIR)
    .filter((file) => {
      const fullPath = path.join(SOURCE_DIR, file);
      const ext = path.extname(file).toLowerCase();
      return fs.statSync(fullPath).isFile() && validExtensions.has(ext);
    })
    .sort(naturalSort);

  if (sourceFiles.length === 0) {
    throw new Error(`No image files found in ${SOURCE_DIR}`);
  }

  console.log(`Found ${sourceFiles.length} image files in ${SOURCE_DIR}`);
  console.log(`Have ${names.length} target names\n`);

  const count = Math.min(sourceFiles.length, names.length);

  if (sourceFiles.length !== names.length) {
    console.warn(
      `Count mismatch: ${sourceFiles.length} files vs ${names.length} names. Processing first ${count}.\n`
    );
  }

  for (let i = 0; i < count; i += 1) {
    const sourceFile = sourceFiles[i];
    const ext = path.extname(sourceFile).toLowerCase();
    const targetFile = `${names[i]}${ext}`;

    const from = path.join(SOURCE_DIR, sourceFile);
    const to = path.join(TARGET_DIR, targetFile);

    if (fs.existsSync(to)) {
      console.warn(`Skipping, target exists: ${to}`);
      continue;
    }

    console.log(`${sourceFile} -> public/images/restaurants/${targetFile}`);

    if (!DRY_RUN) {
      fs.renameSync(from, to);
    }
  }

  console.log(`\n${DRY_RUN ? "Dry run complete." : "Rename complete."}`);
}

main();
