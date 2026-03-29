"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import dynamic from "next/dynamic";
import {
  locationCoords,
  locationDetails,
  planInterIslandTransfer,
  serviceAlerts,
} from "../data/usviTransit";
import { db } from "@/lib/firebase/client";

const RoutePreviewMap = dynamic(() => import("./RoutePreviewMap"), {
  ssr: false,
  loading: () => (
    <p className="p-4 text-sm text-slate-500">Loading route map...</p>
  ),
});

type RideSharingAppProps = {
  initialPickup?: string;
  initialDropoff?: string;
};

type Coordinates = {
  lat: number;
  lng: number;
};

type LocationType =
  | "airport"
  | "ferry"
  | "beach"
  | "town"
  | "hotel"
  | "other"
  | "road"
  | "neighborhood"
  | "landmark";

type LocationDetail = {
  island: string;
  type: LocationType;
};

type TransferPlan = {
  mode: string;
  from: string;
  to: string;
  durationMinutes: number;
  cadence: string;
} | null;

type ServiceAlert = {
  id: string;
  island: string;
  severity: "low" | "medium" | "high";
  title: string;
  impact: string;
};

type DriverProfile = {
  name: string;
  rating: number;
  trips: number;
  vehicle: string;
  eta: string;
};

type RideOption = {
  id: "standard" | "xl" | "premium";
  label: string;
  multiplier: number;
  seats: number;
  accent: string;
};

type PaymentMethod = {
  id: "visa" | "mastercard" | "applepay";
  label: string;
};

type RideStatus = "idle" | "searching" | "matched" | "confirmed" | "enroute";
type StatusStepKey = "requested" | "matched" | "confirmed" | "enroute";

type TaxiRateDoc = {
  id: string;
  from: string;
  to: string;
  island: string;
  rateOne: number;
  rateTwoPlus: number;
  durationMin?: number;
};

type EstimateBreakdown = {
  routeBaseFare: number;
  rideTypeAdjustment: number;
  promoDiscount: number;
  bookingFee: number;
};

type Estimate = {
  fare: string | null;
  minutes: number | null;
  miles: number | null;
  breakdown: EstimateBreakdown | null;
  matchedRouteLabel: string | null;
};

type Preferences = {
  quietRide: boolean;
  extraLuggage: boolean;
  accessibility: boolean;
};

type FireLocation = {
  id: string;
  name: string;
  island: string;
  kind: LocationType;
  routeLabel: string;
  aliases: string[];
  coordinates?: Coordinates;
  routingCoordinates?: Coordinates;
  isActive: boolean;
  sortOrder?: number;
};

type RideEstimateApi = {
  pickup: {
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
  dropoff: {
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
  pricing: {
    baseFare: number;
    distanceFare: number;
    zoneAdjustment: number;
    surgeMultiplier: number;
    totalEstimate: number;
    currency: "USD";
  };
  routeMeta: {
    matchedRouteLabel: string;
    sameEstate: boolean;
    sameIsland: boolean;
    estimatedDistanceMiles: number;
    routeClass:
      | "local"
      | "town"
      | "airport"
      | "ferry"
      | "tourist_corridor"
      | "cross_island"
      | "interzone";
  };
};

const typedLocationCoords = locationCoords as Record<string, Coordinates>;
const typedLocationDetails = locationDetails as Record<string, LocationDetail>;
const typedServiceAlerts = serviceAlerts as ServiceAlert[];

const driverProfiles: DriverProfile[] = [
  {
    name: "Ava Joseph",
    rating: 4.98,
    trips: 1243,
    vehicle: "Toyota Highlander • Silver",
    eta: "3 min",
  },
  {
    name: "Malik Francis",
    rating: 4.94,
    trips: 987,
    vehicle: "Honda Pilot • Blue",
    eta: "4 min",
  },
];

const rideOptions: RideOption[] = [
  {
    id: "standard",
    label: "Island Standard",
    multiplier: 1,
    seats: 4,
    accent: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    id: "xl",
    label: "Island XL",
    multiplier: 1.35,
    seats: 6,
    accent: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    id: "premium",
    label: "Island Premium",
    multiplier: 1.75,
    seats: 4,
    accent: "border-amber-200 bg-amber-50 text-amber-800",
  },
];

const trustBadges = [
  { label: "Licensed VI drivers", detail: "Locally verified and route-aware" },
  { label: "Estate-aware pickup", detail: "Mapped to local estates and zones" },
  { label: "Live trip sharing", detail: "Share ride flow with family and friends" },
  { label: "Ferry-ready dispatch", detail: "Timed for Red Hook, Cruz Bay, and STX" },
] as const;

const statusSteps: { key: StatusStepKey; label: string }[] = [
  { key: "requested", label: "Requested" },
  { key: "matched", label: "Matched" },
  { key: "confirmed", label: "Confirmed" },
  { key: "enroute", label: "On the road" },
];

const paymentMethods: PaymentMethod[] = [
  { id: "visa", label: "Visa •••• 4242" },
  { id: "mastercard", label: "Mastercard •••• 1055" },
  { id: "applepay", label: "Apple Pay" },
];

const tipOptions = ["0%", "10%", "15%", "20%"] as const;

const islandOpsNotes = [
  "Airport and cruise peaks drive the strongest St. Thomas dispatch demand.",
  "Red Hook and Cruz Bay timing should stay synced to ferry windows.",
  "Estate-aware routing is the key differentiator over mainland ride apps.",
] as const;

const legacyRouteNameMap: Record<string, string> = {
  "Cyril E. King Airport (STT)": "Airport Terminal",
  "Henry E. Rohlsen Airport (STX)": "Airport Terminal",
  "Red Hook Ferry Terminal": "Red Hook",
  "Cruz Bay Ferry Dock": "Cruz Bay",
  "Charlotte Amalie": "Charlotte Amalie",
  Christiansted: "Christiansted",
};

function normalizePlace(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

function estimateMiles(from?: Coordinates, to?: Coordinates) {
  if (!from || !to) return null;
  const distance = Math.sqrt(
    Math.pow(from.lat - to.lat, 2) + Math.pow(from.lng - to.lng, 2)
  );
  return Math.max(1, Math.round(distance * 69));
}

function sameRouteMatch(
  rate: TaxiRateDoc,
  pickupRouteName: string,
  dropoffRouteName: string
) {
  const from = normalizePlace(rate.from);
  const to = normalizePlace(rate.to);

  return (
    (from === pickupRouteName && to === dropoffRouteName) ||
    (from === dropoffRouteName && to === pickupRouteName)
  );
}

function toLegacyRouteName(value: string) {
  return legacyRouteNameMap[value] ?? value;
}

function islandNameToCode(value?: string) {
  const map: Record<string, "STT" | "STJ" | "STX" | "WAT" | "UNK"> = {
    "St. Thomas": "STT",
    "St. John": "STJ",
    "St. Croix": "STX",
    "Water Island": "WAT",
    STT: "STT",
    STJ: "STJ",
    STX: "STX",
    WAT: "WAT",
  };

  return value ? map[value] ?? "UNK" : "UNK";
}

function badgeForZoneType(zoneType?: string) {
  switch (zoneType) {
    case "airport":
      return "bg-sky-100 text-sky-700";
    case "ferry":
      return "bg-cyan-100 text-cyan-700";
    case "hotel":
      return "bg-violet-100 text-violet-700";
    case "beach":
      return "bg-amber-100 text-amber-800";
    case "downtown":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function severityClass(severity: ServiceAlert["severity"]) {
  switch (severity) {
    case "high":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-sky-200 bg-sky-50 text-sky-800";
  }
}

function islandPill(island?: string) {
  switch (island) {
    case "St. Thomas":
    case "STT":
      return "bg-sky-100 text-sky-700";
    case "St. John":
    case "STJ":
      return "bg-emerald-100 text-emerald-700";
    case "St. Croix":
    case "STX":
      return "bg-violet-100 text-violet-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-black tracking-tight text-slate-900">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function RideSharingApp({
  initialPickup,
  initialDropoff,
}: RideSharingAppProps) {
  const [pickup, setPickup] = useState<string>(
    initialPickup ?? "Cyril E. King Airport (STT)"
  );
  const [dropoff, setDropoff] = useState<string>(
    initialDropoff ?? "Red Hook Ferry Terminal"
  );

  const [estimate, setEstimate] = useState<Estimate>({
    fare: null,
    minutes: null,
    miles: null,
    breakdown: null,
    matchedRouteLabel: null,
  });
  const [rideEstimate, setRideEstimate] = useState<RideEstimateApi | null>(
    null
  );
  const [rideEstimateLoading, setRideEstimateLoading] = useState(false);

  const [status, setStatus] = useState<RideStatus>("idle");
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile>(
    driverProfiles[0]
  );
  const [selectedRide, setSelectedRide] = useState<RideOption>(rideOptions[0]);
  const [riders, setRiders] = useState("1");
  const [pickupTime, setPickupTime] = useState("ASAP");
  const [promoCode, setPromoCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod["id"]>(
    paymentMethods[0].id
  );
  const [tip, setTip] = useState<(typeof tipOptions)[number]>(tipOptions[1]);
  const [preferences, setPreferences] = useState<Preferences>({
    quietRide: false,
    extraLuggage: false,
    accessibility: false,
  });

  const [locations, setLocations] = useState<FireLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [taxiRates, setTaxiRates] = useState<TaxiRateDoc[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [flowError, setFlowError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    if (initialPickup && initialPickup !== pickup) {
      setPickup(initialPickup);
      setStatus("idle");
      setBookingError("");
      setBookingSuccess("");
    }
  }, [initialPickup, pickup]);

  useEffect(() => {
    if (initialDropoff && initialDropoff !== dropoff) {
      setDropoff(initialDropoff);
      setStatus("idle");
      setBookingError("");
      setBookingSuccess("");
    }
  }, [initialDropoff, dropoff]);

  const pickupLocation = useMemo(
    () => locations.find((loc) => loc.name === pickup) ?? null,
    [locations, pickup]
  );

  const dropoffLocation = useMemo(
    () => locations.find((loc) => loc.name === dropoff) ?? null,
    [locations, dropoff]
  );

  const pickupCoords =
    pickupLocation?.routingCoordinates ??
    pickupLocation?.coordinates ??
    typedLocationCoords[pickup] ??
    undefined;

  const dropoffCoords =
    dropoffLocation?.routingCoordinates ??
    dropoffLocation?.coordinates ??
    typedLocationCoords[dropoff] ??
    undefined;

  const pickupInfo = pickupLocation
    ? { island: pickupLocation.island, type: pickupLocation.kind }
    : typedLocationDetails[pickup];

  const dropoffInfo = dropoffLocation
    ? { island: dropoffLocation.island, type: dropoffLocation.kind }
    : typedLocationDetails[dropoff];

  const pickupIsland = pickupInfo?.island ?? "";
  const dropoffIsland = dropoffInfo?.island ?? "";

  const requiresInterIslandTransfer =
    Boolean(pickupIsland && dropoffIsland) && pickupIsland !== dropoffIsland;

  const transferPlan = useMemo<TransferPlan>(() => {
    return planInterIslandTransfer(pickup, dropoff) as TransferPlan;
  }, [pickup, dropoff]);

  const discountMultiplier = useMemo(() => {
    return promoCode.trim().length >= 4 ? 0.9 : 1.0;
  }, [promoCode]);

  const activeAlerts = useMemo(() => {
    const islands = [pickupIsland, dropoffIsland].filter(Boolean) as string[];
    return typedServiceAlerts.filter((alert) => islands.includes(alert.island));
  }, [pickupIsland, dropoffIsland]);

  const pickupRouteName = useMemo(() => {
    return normalizePlace(
      pickupLocation?.routeLabel ?? toLegacyRouteName(pickup)
    );
  }, [pickupLocation, pickup]);

  const dropoffRouteName = useMemo(() => {
    return normalizePlace(
      dropoffLocation?.routeLabel ?? toLegacyRouteName(dropoff)
    );
  }, [dropoffLocation, dropoff]);

  const activeIslandCode = useMemo(() => {
    const islandCodeMap: Record<string, string> = {
      "St. Thomas": "STT",
      "St. John": "STJ",
      "St. Croix": "STX",
      STT: "STT",
      STJ: "STJ",
      STX: "STX",
    };
    return islandCodeMap[pickupIsland] ?? "";
  }, [pickupIsland]);

  useEffect(() => {
    let cancelled = false;

    async function loadLocations() {
      setLocationsLoading(true);

      try {
        if (!db) {
          setLocations([]);
          setLocationsLoading(false);
          return;
        }

        const snapshots = await Promise.all([
          getDocs(
            query(
              collection(db, "locations"),
              where("isActive", "==", true),
              limit(1500)
            )
          ),
          getDocs(query(collection(db, "locations"), limit(1500))),
        ]);

        if (cancelled) return;

        const chosen =
          snapshots[0].docs.length > 0 ? snapshots[0] : snapshots[1];

        const nextLocations: FireLocation[] = chosen.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const coordinates = (data.coordinates ?? {}) as {
            lat?: number;
            lng?: number;
          };
          const routingCoordinates = (data.routingCoordinates ?? {}) as {
            lat?: number;
            lng?: number;
          };

          const name = String(data.name ?? "");
          const island = String(
            data.island ?? typedLocationDetails[name]?.island ?? ""
          );
          const kind = String(
            data.kind ?? typedLocationDetails[name]?.type ?? "landmark"
          ) as LocationType;

          return {
            id: docSnap.id,
            name,
            island,
            kind,
            routeLabel: String(data.routeLabel ?? toLegacyRouteName(name)),
            aliases: Array.isArray(data.aliases)
              ? data.aliases.map(String)
              : [],
            coordinates:
              typeof coordinates.lat === "number" &&
              typeof coordinates.lng === "number"
                ? { lat: coordinates.lat, lng: coordinates.lng }
                : typedLocationCoords[name],
            routingCoordinates:
              typeof routingCoordinates.lat === "number" &&
              typeof routingCoordinates.lng === "number"
                ? { lat: routingCoordinates.lat, lng: routingCoordinates.lng }
                : undefined,
            isActive: Boolean(data.isActive ?? true),
            sortOrder:
              typeof data.sortOrder === "number" ? data.sortOrder : undefined,
          };
        });

        nextLocations.sort((a, b) => {
          const aOrder = a.sortOrder ?? 999999;
          const bOrder = b.sortOrder ?? 999999;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return a.name.localeCompare(b.name);
        });

        setLocations(nextLocations);

        const names = new Set(nextLocations.map((loc) => loc.name));

        if (!names.has(pickup) && nextLocations[0]) {
          setPickup(nextLocations[0].name);
        }

        if (!names.has(dropoff) && nextLocations[1]) {
          setDropoff(nextLocations[1].name);
        }
      } catch (error) {
        console.error("Failed to load locations", error);
        setLocations([]);
      } finally {
        if (!cancelled) setLocationsLoading(false);
      }
    }

    loadLocations();

    return () => {
      cancelled = true;
    };
  }, [pickup, dropoff]);

  useEffect(() => {
    if (!activeIslandCode || requiresInterIslandTransfer) {
      setTaxiRates([]);
      setRatesLoading(false);
      return;
    }

    let cancelled = false;

    async function loadTaxiRates() {
      setRatesLoading(true);

      try {
        if (!db) {
          setTaxiRates([]);
          setRatesLoading(false);
          return;
        }

        const q = query(
          collection(db, "taxiRates"),
          where("island", "==", activeIslandCode),
          limit(1000)
        );

        const snapshot = await getDocs(q);
        if (cancelled) return;

        const nextRates: TaxiRateDoc[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          return {
            id: docSnap.id,
            from: String(data.from ?? ""),
            to: String(data.to ?? ""),
            island: String(data.island ?? ""),
            rateOne: Number(data.rateOne ?? 0),
            rateTwoPlus: Number(data.rateTwoPlus ?? 0),
            durationMin:
              typeof data.durationMin === "number"
                ? data.durationMin
                : undefined,
          };
        });

        setTaxiRates(nextRates);
      } catch (error) {
        console.error("Failed to load taxi rates", error);
        setTaxiRates([]);
      } finally {
        if (!cancelled) setRatesLoading(false);
      }
    }

    loadTaxiRates();

    return () => {
      cancelled = true;
    };
  }, [activeIslandCode, requiresInterIslandTransfer]);

  const matchedTaxiRate = useMemo(() => {
    if (requiresInterIslandTransfer) return null;
    if (!pickupRouteName || !dropoffRouteName) return null;

    return (
      taxiRates.find((rate) =>
        sameRouteMatch(rate, pickupRouteName, dropoffRouteName)
      ) ?? null
    );
  }, [
    taxiRates,
    pickupRouteName,
    dropoffRouteName,
    requiresInterIslandTransfer,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      if (!pickupCoords || !dropoffCoords || requiresInterIslandTransfer) {
        setRideEstimate(null);
        setRideEstimateLoading(false);
        return;
      }

      setRideEstimateLoading(true);

      try {
        const response = await fetch("/api/rides/estimate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            pickup: {
              label: pickup,
              lat: pickupCoords.lat,
              lng: pickupCoords.lng,
            },
            dropoff: {
              label: dropoff,
              lat: dropoffCoords.lat,
              lng: dropoffCoords.lng,
            },
          }),
        });

        if (response.status === 429) {
          setFlowError(
            "Service is temporarily busy. Please wait a moment and try again."
          );
          setRideEstimate(null);
          return;
        }

        if (!response.ok) {
          const text = await response.text();
          console.error("Estimate API response:", response.status, text);
          setRideEstimate(null);
          return;
        }

        const data = (await response.json()) as RideEstimateApi;
        setFlowError("");
        setRideEstimate(data);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Ride estimate API failed", error);
          setRideEstimate(null);
        }
      } finally {
        setRideEstimateLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    pickup,
    dropoff,
    pickupCoords,
    dropoffCoords,
    requiresInterIslandTransfer,
  ]);

  useEffect(() => {
    const miles = estimateMiles(pickupCoords, dropoffCoords);

    if (!pickupCoords || !dropoffCoords || miles === null) {
      setEstimate({
        fare: null,
        minutes: null,
        miles: null,
        breakdown: null,
        matchedRouteLabel: null,
      });
      return;
    }

    const fallbackMinutes = Math.max(8, Math.round((miles / 25) * 60));

    if (!matchedTaxiRate) {
      setEstimate({
        fare: null,
        minutes: fallbackMinutes,
        miles,
        breakdown: null,
        matchedRouteLabel: null,
      });
      return;
    }

    const riderCount = Number(riders) || 1;
    const routeBaseFare =
      riderCount <= 1 ? matchedTaxiRate.rateOne : matchedTaxiRate.rateTwoPlus;

    const rideTypeAdjustedFare = routeBaseFare * selectedRide.multiplier;
    const rideTypeAdjustment = rideTypeAdjustedFare - routeBaseFare;
    const promoDiscount = rideTypeAdjustedFare * (1 - discountMultiplier);
    const bookingFee = 2.5;
    const finalFare = rideTypeAdjustedFare - promoDiscount + bookingFee;

    setEstimate({
      fare: finalFare.toFixed(2),
      minutes: matchedTaxiRate.durationMin ?? fallbackMinutes,
      miles,
      breakdown: {
        routeBaseFare,
        rideTypeAdjustment,
        promoDiscount,
        bookingFee,
      },
      matchedRouteLabel: `${matchedTaxiRate.from} → ${matchedTaxiRate.to}`,
    });
  }, [
    pickupCoords,
    dropoffCoords,
    matchedTaxiRate,
    riders,
    selectedRide,
    discountMultiplier,
  ]);

  useEffect(() => {
    if (status !== "searching") return;

    const timer = window.setTimeout(() => {
      setSelectedDriver(
        driverProfiles[Math.floor(Math.random() * driverProfiles.length)]
      );
      setStatus("matched");
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (requiresInterIslandTransfer) {
      setFlowError(
        "This trip crosses islands. Complete the ferry or air connector first, then book the on-island ride."
      );
      return;
    }

    if (!ratesLoading && !matchedTaxiRate && !rideEstimate) {
      setFlowError(
        "No fare rule is mapped for this route yet. Add or normalize the route in Firestore taxiRates."
      );
      return;
    }

    setFlowError("");
  }, [
    requiresInterIslandTransfer,
    ratesLoading,
    matchedTaxiRate,
    rideEstimate,
  ]);

  function handleSwap() {
    setPickup(dropoff);
    setDropoff(pickup);
    setStatus("idle");
    setBookingSuccess("");
    setBookingError("");
  }

  function handleRequestRide() {
    if (requiresInterIslandTransfer) return;
    if (!matchedTaxiRate && !rideEstimate) return;

    if (status === "idle") {
      setStatus("searching");
      return;
    }

    if (status === "matched") {
      setStatus("confirmed");
      return;
    }

    if (status === "confirmed") {
      setStatus("enroute");
    }
  }

  function handleCancel() {
    setStatus("idle");
  }

  function handlePreferenceChange(key: keyof Preferences) {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const islandFilteredLocations = useMemo(() => {
    if (!activeIslandCode) return locations;
    return locations.filter(
      (loc) => loc.island === activeIslandCode || loc.island === pickupIsland
    );
  }, [locations, activeIslandCode, pickupIsland]);

  const isMatched =
    status === "matched" || status === "confirmed" || status === "enroute";

  const activeStep: StatusStepKey =
    status === "idle" || status === "searching" ? "requested" : status;

  const progressValue =
    status === "idle" || status === "searching"
      ? 25
      : status === "matched"
      ? 50
      : status === "confirmed"
      ? 75
      : 100;

  const tipMultiplier = Number(tip.replace("%", "")) / 100;

  const effectiveFare = useMemo(() => {
    if (rideEstimate) {
      const selectedAdjusted =
        rideEstimate.pricing.totalEstimate * selectedRide.multiplier;
      const promoDiscountAmount = selectedAdjusted * (1 - discountMultiplier);
      const adjusted = selectedAdjusted - promoDiscountAmount;
      return Number(adjusted.toFixed(2));
    }

    return estimate.fare ? Number(estimate.fare) : 0;
  }, [rideEstimate, selectedRide, discountMultiplier, estimate.fare]);

  const tipAmount = effectiveFare * tipMultiplier;
  const totalFare = (effectiveFare + tipAmount).toFixed(2);

  const canRequest =
    !requiresInterIslandTransfer && Boolean(matchedTaxiRate || rideEstimate);

  const allSelectableLocations =
    islandFilteredLocations.length > 0
      ? islandFilteredLocations
      : Object.keys(typedLocationCoords).map((name) => ({
          id: name,
          name,
          island: typedLocationDetails[name]?.island ?? "",
          kind: typedLocationDetails[name]?.type ?? "landmark",
          routeLabel: toLegacyRouteName(name),
          aliases: [],
          coordinates: typedLocationCoords[name],
          routingCoordinates: undefined,
          isActive: true,
        }));

  const displayedFare =
    rideEstimate && !requiresInterIslandTransfer
      ? formatMoney(effectiveFare)
      : estimate.fare
      ? `$${estimate.fare}`
      : null;

  const displayedMinutes = rideEstimate?.routeMeta
    ? Math.max(
        8,
        Math.round((rideEstimate.routeMeta.estimatedDistanceMiles / 22) * 60)
      )
    : estimate.minutes;

  const displayedMiles =
    rideEstimate?.routeMeta?.estimatedDistanceMiles ?? estimate.miles;

  const displayedRouteLabel =
    rideEstimate?.routeMeta?.matchedRouteLabel ?? estimate.matchedRouteLabel;

  const pickupEstateLabel =
    rideEstimate?.pickup.estateName ?? "Estate lookup pending";
  const dropoffEstateLabel =
    rideEstimate?.dropoff.estateName ?? "Estate lookup pending";

  const pickupIslandCode =
    rideEstimate?.pickup.islandCode ?? islandNameToCode(pickupIsland);
  const dropoffIslandCode =
    rideEstimate?.dropoff.islandCode ?? islandNameToCode(dropoffIsland);

  const hasGuidedDestination = Boolean(initialPickup || initialDropoff);

  async function handleCreateBooking() {
    setBookingError("");
    setBookingSuccess("");

    if (!pickupCoords || !dropoffCoords) {
      setBookingError("Pickup and dropoff are required.");
      return;
    }

    if (!customerName.trim()) {
      setBookingError("Please enter the rider name.");
      return;
    }

    if (!customerPhone.trim()) {
      setBookingError("Please enter the rider phone number.");
      return;
    }

    const pricing = rideEstimate
      ? {
          baseFare: rideEstimate.pricing.baseFare,
          distanceFare: rideEstimate.pricing.distanceFare,
          zoneAdjustment: rideEstimate.pricing.zoneAdjustment,
          surgeMultiplier: rideEstimate.pricing.surgeMultiplier,
          totalEstimate: effectiveFare,
          currency: "USD" as const,
        }
      : {
          baseFare: estimate.breakdown?.routeBaseFare ?? 0,
          distanceFare: estimate.breakdown?.rideTypeAdjustment ?? 0,
          zoneAdjustment: 0,
          surgeMultiplier: 1,
          totalEstimate: effectiveFare,
          currency: "USD" as const,
        };

    const routeMeta = rideEstimate
      ? {
          sameEstate: rideEstimate.routeMeta.sameEstate,
          sameIsland: rideEstimate.routeMeta.sameIsland,
          estimatedDistanceMiles: rideEstimate.routeMeta.estimatedDistanceMiles,
          routeClass: rideEstimate.routeMeta.routeClass,
          matchedRouteLabel:
            rideEstimate.routeMeta.matchedRouteLabel ??
            `${pickup} → ${dropoff}`,
        }
      : {
          sameEstate: false,
          sameIsland: pickupIsland === dropoffIsland,
          estimatedDistanceMiles: estimate.miles ?? 0,
          routeClass: "interzone",
          matchedRouteLabel:
            estimate.matchedRouteLabel ?? `${pickup} → ${dropoff}`,
        };

    const payload = {
      customer: {
        fullName: customerName,
        phone: customerPhone,
        email: customerEmail || null,
      },
      trip: {
        pickupTime,
        riders: Number(riders) || 1,
        rideType: selectedRide.id,
        paymentMethod,
        tipPercent: Number(tip.replace("%", "")),
        promoCode: promoCode || null,
        preferences,
      },
      pickup: {
        label: pickup,
        lat: pickupCoords.lat,
        lng: pickupCoords.lng,
        estateGeoid: rideEstimate?.pickup.estateGeoid ?? null,
        estateName: rideEstimate?.pickup.estateName ?? null,
        islandCode: rideEstimate?.pickup.islandCode ?? "UNK",
        zoneType: rideEstimate?.pickup.zoneType ?? "estate",
      },
      dropoff: {
        label: dropoff,
        lat: dropoffCoords.lat,
        lng: dropoffCoords.lng,
        estateGeoid: rideEstimate?.dropoff.estateGeoid ?? null,
        estateName: rideEstimate?.dropoff.estateName ?? null,
        islandCode: rideEstimate?.dropoff.islandCode ?? "UNK",
        zoneType: rideEstimate?.dropoff.zoneType ?? "estate",
      },
      pricing,
      routeMeta,
    };

    try {
      setBookingLoading(true);

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Booking API response:", response.status, text);
        setBookingError("Unable to create booking right now.");
        return;
      }

      const data = (await response.json()) as {
        ok: boolean;
        bookingId: string;
        status: string;
      };

      setBookingSuccess(`Booking created: ${data.bookingId}`);
      setStatus("searching");
    } catch (error) {
      console.error(error);
      setBookingError("Unable to create booking right now.");
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-2 py-3 md:px-4 md:py-5">
      <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0b5f7a_0%,#1797b8_46%,#f3a53b_100%)] px-5 py-7 text-white md:px-7 md:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_25%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-white/90">
                VI Ride Network
              </div>
              <h2 className="text-3xl font-black tracking-tight md:text-5xl">
                Island rides built
                <span className="block text-white/95">
                  for the Virgin Islands.
                </span>
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/90 md:text-base">
                Estate-aware routing, ferry-conscious movement, airport pickup,
                beach runs, and local booking flow designed for the way the
                islands actually move.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
              <div className="rounded-[24px] bg-white/12 p-4 backdrop-blur">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
                  Pickup island
                </div>
                <div className="mt-2 text-lg font-black">{pickupIslandCode}</div>
              </div>
              <div className="rounded-[24px] bg-white/12 p-4 backdrop-blur">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
                  Dropoff island
                </div>
                <div className="mt-2 text-lg font-black">{dropoffIslandCode}</div>
              </div>
              <div className="rounded-[24px] bg-white/12 p-4 backdrop-blur">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
                  Route class
                </div>
                <div className="mt-2 text-sm font-black uppercase">
                  {rideEstimate?.routeMeta.routeClass.replace(/_/g, " ") ??
                    "pending"}
                </div>
              </div>
              <div className="rounded-[24px] bg-white/12 p-4 backdrop-blur">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
                  Estimate
                </div>
                <div className="mt-2 text-lg font-black">
                  {ratesLoading || rideEstimateLoading
                    ? "Loading"
                    : displayedFare ?? "No match"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-4 md:p-6 xl:grid-cols-[1.18fr_0.82fr]">
          <div className="space-y-6">
            {hasGuidedDestination ? (
              <div className="rounded-[28px] border border-sky-200 bg-sky-50 p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-700">
                  Guided from discovery flow
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  This ride was prefilled from another part of the app, so the
                  guest can keep moving without starting over.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {initialPickup ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                      Pickup: {initialPickup}
                    </span>
                  ) : null}
                  {initialDropoff ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                      Dropoff: {initialDropoff}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <SectionCard
              title="Trip builder"
              subtitle="Choose your pickup, dropoff, timing, and rider count."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="xl:col-span-2">
                  <label
                    htmlFor="ride-pickup"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500"
                  >
                    Pickup
                  </label>
                  <select
                    id="ride-pickup"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    value={pickup}
                    onChange={(e) => {
                      setPickup(e.target.value);
                      setStatus("idle");
                    }}
                    disabled={locationsLoading}
                  >
                    {allSelectableLocations.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.name}
                      </option>
                    ))}
                  </select>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {pickupEstateLabel}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${islandPill(
                        pickupIslandCode
                      )}`}
                    >
                      {pickupIslandCode}
                    </span>
                    {rideEstimate?.pickup.zoneType ? (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${badgeForZoneType(
                          rideEstimate.pickup.zoneType
                        )}`}
                      >
                        {rideEstimate.pickup.zoneType}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="xl:col-span-2">
                  <label
                    htmlFor="ride-dropoff"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500"
                  >
                    Dropoff
                  </label>
                  <select
                    id="ride-dropoff"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    value={dropoff}
                    onChange={(e) => {
                      setDropoff(e.target.value);
                      setStatus("idle");
                    }}
                    disabled={locationsLoading}
                  >
                    {allSelectableLocations.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.name}
                      </option>
                    ))}
                  </select>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {dropoffEstateLabel}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${islandPill(
                        dropoffIslandCode
                      )}`}
                    >
                      {dropoffIslandCode}
                    </span>
                    {rideEstimate?.dropoff.zoneType ? (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${badgeForZoneType(
                          rideEstimate.dropoff.zoneType
                        )}`}
                      >
                        {rideEstimate.dropoff.zoneType}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="ride-riders"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500"
                  >
                    Riders
                  </label>
                  <select
                    id="ride-riders"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    value={riders}
                    onChange={(e) => setRiders(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6].map((count) => (
                      <option key={count} value={count.toString()}>
                        {count}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="ride-time"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500"
                  >
                    Pickup time
                  </label>
                  <select
                    id="ride-time"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                  >
                    <option value="ASAP">ASAP</option>
                    <option value="In 15 min">In 15 min</option>
                    <option value="In 30 min">In 30 min</option>
                    <option value="In 1 hour">In 1 hour</option>
                  </select>
                </div>

                <div className="xl:col-span-2">
                  <label
                    htmlFor="ride-promo"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500"
                  >
                    Promo code
                  </label>
                  <input
                    id="ride-promo"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    type="text"
                    placeholder="ISLAND10"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                  />
                </div>

                <div className="xl:col-span-2">
                  <button
                    type="button"
                    onClick={handleSwap}
                    className="mt-7 inline-flex h-[50px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Swap route
                  </button>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Choose your ride"
              subtitle="A product surface for tourists, locals, beach runs, airport pickups, and premium movement."
            >
              <div className="grid gap-3 md:grid-cols-3">
                {rideOptions.map((option) => {
                  const active = selectedRide.id === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedRide(option)}
                      className={`rounded-[28px] border p-5 text-left transition ${
                        active
                          ? option.accent
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="text-base font-black">{option.label}</div>
                      <p className="mt-2 text-sm opacity-80">
                        {option.seats} seats • {option.multiplier}x pricing
                      </p>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-5">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  Estimated fare
                </div>
                <div className="mt-3 text-2xl font-black text-slate-900">
                  {ratesLoading || rideEstimateLoading
                    ? "Loading..."
                    : displayedFare ?? "No match"}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#fbfcfe)] p-5">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  Trip time
                </div>
                <div className="mt-3 text-2xl font-black text-slate-900">
                  {displayedMinutes
                    ? `${displayedMinutes}-${displayedMinutes + 8} min`
                    : "--"}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#fdfcf8)] p-5">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  Distance
                </div>
                <div className="mt-3 text-2xl font-black text-slate-900">
                  {displayedMiles ? `${displayedMiles} mi` : "--"}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fffc)] p-5">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  Route
                </div>
                <div className="mt-3 text-sm font-black text-slate-900">
                  {displayedRouteLabel ?? "No route match"}
                </div>
              </div>
            </div>

            {rideEstimate ? (
              <SectionCard
                title="Estate intelligence"
                subtitle="This is what separates the product from generic mainland ride apps."
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                    {rideEstimate.routeMeta.routeClass.replace(/_/g, " ")}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                    {rideEstimate.routeMeta.sameEstate
                      ? "same estate"
                      : "multi-estate"}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                    {rideEstimate.routeMeta.sameIsland
                      ? "same island"
                      : "inter-island"}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                      Pickup estate
                    </div>
                    <div className="mt-2 text-base font-black text-slate-900">
                      {rideEstimate.pickup.estateName ?? "Unknown estate"}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {rideEstimate.pickup.label} · {rideEstimate.pickup.islandCode}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                      Dropoff estate
                    </div>
                    <div className="mt-2 text-base font-black text-slate-900">
                      {rideEstimate.dropoff.estateName ?? "Unknown estate"}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {rideEstimate.dropoff.label} · {rideEstimate.dropoff.islandCode}
                    </div>
                  </div>
                </div>
              </SectionCard>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <SectionCard
                title="Trip summary"
                subtitle="A quick read of the trip the rider is about to request."
              >
                <p className="text-sm text-slate-600">
                  {pickup} → {dropoff}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                    {selectedRide.label}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {pickupTime}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {riders} rider{riders === "1" ? "" : "s"}
                  </span>
                  {rideEstimate?.routeMeta.routeClass ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      {rideEstimate.routeMeta.routeClass.replace(/_/g, " ")}
                    </span>
                  ) : null}
                </div>
              </SectionCard>

              <SectionCard
                title="Pricing breakdown"
                subtitle="Transparent pricing is critical for trust in a USVI ride marketplace."
              >
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex justify-between gap-4">
                    <span>Base fare</span>
                    <span className="font-semibold">
                      {rideEstimate
                        ? formatMoney(rideEstimate.pricing.baseFare)
                        : estimate.breakdown
                        ? `$${estimate.breakdown.routeBaseFare.toFixed(2)}`
                        : "$0.00"}
                    </span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Distance / ride adjustment</span>
                    <span className="font-semibold">
                      {rideEstimate
                        ? formatMoney(
                            rideEstimate.pricing.distanceFare +
                              rideEstimate.pricing.totalEstimate *
                                (selectedRide.multiplier - 1)
                          )
                        : estimate.breakdown
                        ? `$${estimate.breakdown.rideTypeAdjustment.toFixed(2)}`
                        : "$0.00"}
                    </span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Zone adjustment</span>
                    <span className="font-semibold">
                      {rideEstimate
                        ? formatMoney(rideEstimate.pricing.zoneAdjustment)
                        : "$0.00"}
                    </span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Promo discount</span>
                    <span className="font-semibold">
                      {effectiveFare
                        ? `-$${(
                            (rideEstimate
                              ? rideEstimate.pricing.totalEstimate *
                                selectedRide.multiplier
                              : Number(estimate.fare ?? 0)) *
                            (1 - discountMultiplier)
                          ).toFixed(2)}`
                        : "-$0.00"}
                    </span>
                  </li>
                  <li className="flex justify-between gap-4 border-t border-slate-200 pt-2">
                    <span>Tip selected</span>
                    <span className="font-semibold">
                      {tip} (${tipAmount.toFixed(2)})
                    </span>
                  </li>
                </ul>
              </SectionCard>
            </div>

            {transferPlan ? (
              <section className="rounded-[32px] border border-amber-200 bg-amber-50 p-6">
                <h3 className="text-lg font-black text-amber-900">
                  Inter-island transfer required
                </h3>
                <p className="mt-2 text-sm text-amber-800">
                  Complete this connector first: <strong>{transferPlan.mode}</strong>
                </p>
                <ul className="mt-4 space-y-2 text-sm text-amber-900">
                  <li>Transfer start: {transferPlan.from}</li>
                  <li>Transfer end: {transferPlan.to}</li>
                  <li>
                    Estimated transfer time: {transferPlan.durationMinutes} min
                  </li>
                  <li>Schedule: {transferPlan.cadence}</li>
                </ul>
              </section>
            ) : null}

            <div className="rounded-[32px] border border-slate-200 p-4">
              {pickupCoords && dropoffCoords ? (
                <RoutePreviewMap
                  pickupCoords={pickupCoords}
                  dropoffCoords={dropoffCoords}
                  pickupLabel={pickup}
                  dropoffLabel={dropoff}
                  pickupEstate={rideEstimate?.pickup.estateName ?? null}
                  dropoffEstate={rideEstimate?.dropoff.estateName ?? null}
                  nearbyPlaces={allSelectableLocations
                    .filter((loc) => Boolean(loc.coordinates))
                    .map((loc) => ({
                      id: loc.id,
                      name: loc.name,
                      island: loc.island,
                      kind: loc.kind,
                      routeLabel: loc.routeLabel,
                      coordinates: loc.coordinates!,
                    }))}
                />
              ) : (
                <p className="p-4 text-sm text-slate-500">
                  Select pickup and dropoff to preview the route.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {activeAlerts.length > 0 ? (
              <SectionCard
                title="Island travel alerts"
                subtitle="Operational context for ferries, weather, traffic, and service disruption."
              >
                <div className="space-y-3">
                  {activeAlerts.map((alert) => (
                    <article
                      key={alert.id}
                      className={`rounded-2xl border p-4 ${severityClass(
                        alert.severity
                      )}`}
                    >
                      <div className="text-[11px] font-black uppercase tracking-[0.22em]">
                        {alert.severity}
                      </div>
                      <strong className="mt-1 block">{alert.title}</strong>
                      <p className="mt-1 text-sm opacity-90">{alert.impact}</p>
                    </article>
                  ))}
                </div>
              </SectionCard>
            ) : null}

            <SectionCard
              title="Rider details"
              subtitle="Needed to confirm booking and contact the guest."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="customer-name"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500"
                  >
                    Full name
                  </label>
                  <input
                    id="customer-name"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label
                    htmlFor="customer-phone"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500"
                  >
                    Phone
                  </label>
                  <input
                    id="customer-phone"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="340-555-1234"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="customer-email"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500"
                  >
                    Email
                  </label>
                  <input
                    id="customer-email"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="optional@example.com"
                  />
                </div>
              </div>

              {bookingError ? (
                <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {bookingError}
                </div>
              ) : null}

              {bookingSuccess ? (
                <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {bookingSuccess}
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              title="Trip status"
              subtitle={
                isMatched
                  ? `Driver ${selectedDriver.name} is on the way.`
                  : "Ready to match the rider with a driver."
              }
            >
              {flowError ? (
                <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {flowError}
                </p>
              ) : null}

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#0ea5e9,#10b981,#f59e0b)] transition-all"
                  style={{ width: `${progressValue}%` }}
                />
              </div>

              <div className="mt-5 space-y-3">
                {statusSteps.map((step) => (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm ${
                      activeStep === step.key
                        ? "bg-sky-50 font-semibold text-sky-700"
                        : "text-slate-500"
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        activeStep === step.key ? "bg-sky-500" : "bg-slate-300"
                      }`}
                    />
                    <span>{step.label}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Book and dispatch"
              subtitle="Move from quote to booking to live matching."
            >
              <div className="mb-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <strong className="block text-slate-900">
                      {selectedDriver.name}
                    </strong>
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedDriver.vehicle}
                    </p>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    <div>⭐ {selectedDriver.rating}</div>
                    <div>{selectedDriver.trips} trips</div>
                    <div className="font-semibold text-sky-700">
                      ETA {selectedDriver.eta}
                    </div>
                  </div>
                </div>
              </div>

              {status === "idle" ? (
                <button
                  className="w-full rounded-2xl bg-[linear-gradient(135deg,#0b5f7a,#1797b8)] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                  onClick={handleCreateBooking}
                  disabled={!canRequest || bookingLoading}
                >
                  {bookingLoading
                    ? "Creating booking..."
                    : !canRequest
                    ? "Route unavailable"
                    : "Create booking"}
                </button>
              ) : null}

              {status === "searching" ? (
                <button
                  className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white"
                  type="button"
                  onClick={handleCancel}
                >
                  Searching drivers...
                </button>
              ) : null}

              {status === "matched" ? (
                <button
                  className="w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
                  type="button"
                  onClick={handleRequestRide}
                >
                  Confirm {selectedDriver.eta} pickup
                </button>
              ) : null}

              {status === "confirmed" ? (
                <button
                  className="w-full rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-700"
                  type="button"
                  onClick={handleRequestRide}
                >
                  Start trip
                </button>
              ) : null}

              {status === "enroute" ? (
                <button
                  className="w-full rounded-2xl bg-slate-700 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
                  type="button"
                  onClick={handleCancel}
                >
                  End trip
                </button>
              ) : null}
            </SectionCard>

            <SectionCard
              title="Ride preferences"
              subtitle="Personalize the trip for comfort and accessibility."
            >
              <div className="space-y-3">
                <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <span className="text-sm font-medium text-slate-800">
                    Quiet ride
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.quietRide}
                    onChange={() => handlePreferenceChange("quietRide")}
                  />
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <span className="text-sm font-medium text-slate-800">
                    Extra luggage
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.extraLuggage}
                    onChange={() => handlePreferenceChange("extraLuggage")}
                  />
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <span className="text-sm font-medium text-slate-800">
                    Accessibility support
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.accessibility}
                    onChange={() => handlePreferenceChange("accessibility")}
                  />
                </label>
              </div>
            </SectionCard>

            <SectionCard
              title="Payment and tip"
              subtitle="Simple checkout flow for tourists and locals."
            >
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="ride-payment-method"
                    className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500"
                  >
                    Payment method
                  </label>
                  <select
                    id="ride-payment-method"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900"
                    value={paymentMethod}
                    onChange={(event) =>
                      setPaymentMethod(
                        event.target.value as PaymentMethod["id"]
                      )
                    }
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                    Tip
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {tipOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`rounded-2xl px-3 py-2 text-sm font-black transition ${
                          tip === option
                            ? "bg-sky-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                        onClick={() => setTip(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-[linear-gradient(135deg,#f8fbff,#fffdf7)] p-4 ring-1 ring-slate-200">
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                    Estimated total
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {effectiveFare ? `$${totalFare}` : "Calculating..."}
                  </div>
                </div>
              </div>
            </SectionCard>

            <section className="grid gap-3 sm:grid-cols-2">
              {trustBadges.map((badge) => (
                <div
                  key={badge.label}
                  className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
                >
                  <strong className="block text-slate-900">{badge.label}</strong>
                  <p className="mt-2 text-sm text-slate-600">{badge.detail}</p>
                </div>
              ))}
            </section>

            <SectionCard
              title="USVI operations playbook"
              subtitle="Product notes that support real marketplace behavior in territory conditions."
            >
              <ul className="space-y-2 text-sm text-slate-700">
                {islandOpsNotes.map((note) => (
                  <li key={note}>• {note}</li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </div>
      </section>
    </div>
  );
}