"use client";

import { useMemo, useState } from "react";

import {
  serviceAlerts,
  locationDetails,
  type ServiceAlert,
  type LocationDetail,
} from "../data/usviTransit";

type DriverChecklist = {
  docsReady: boolean;
  vehicleChecked: boolean;
  fuelCharged: boolean;
  safetyKit: boolean;
};

type ChecklistKey = keyof DriverChecklist;

type ConnectorLocation = {
  name: string;
  island: string;
  type: LocationDetail["type"];
};

type IslandRoute = {
  route: string;
  window: string;
  demand: string;
  avgFare: string;
};

type DriverStatus = "offline" | "online" | "on_trip" | "break";

type ShiftMode = "airport" | "town" | "ferry" | "flex";

type DriverTripCard = {
  id: string;
  rider: string;
  pickup: string;
  dropoff: string;
  eta: string;
  fare: string;
  priority: "standard" | "priority" | "vip";
};

const incentives: string[] = [
  "Peak zone bonus: +$5/trip near Red Hook (5pm–8pm)",
  "5-star streak reward: +$40 for 20 trips",
  "Airport pickup priority enabled",
];

const islandRoutes: IslandRoute[] = [
  {
    route: "STT Airport → Red Hook",
    window: "6:00am–10:00am",
    demand: "High",
    avgFare: "$28–$42",
  },
  {
    route: "Red Hook ↔ Cruz Bay Ferry",
    window: "9:00am–7:00pm",
    demand: "Medium",
    avgFare: "$18–$30",
  },
  {
    route: "STX Airport → Christiansted",
    window: "2:00pm–9:00pm",
    demand: "Growing",
    avgFare: "$24–$36",
  },
];

const liveTrips: DriverTripCard[] = [
  {
    id: "trip_101",
    rider: "Amelia H.",
    pickup: "Cyril E. King Airport",
    dropoff: "Red Hook Ferry Terminal",
    eta: "4 min",
    fare: "$34.00",
    priority: "priority",
  },
  {
    id: "trip_102",
    rider: "Marcus J.",
    pickup: "Charlotte Amalie",
    dropoff: "Magens Bay",
    eta: "8 min",
    fare: "$22.50",
    priority: "standard",
  },
  {
    id: "trip_103",
    rider: "Villa Concierge",
    pickup: "Ritz-Carlton",
    dropoff: "Airport Terminal",
    eta: "12 min",
    fare: "$48.00",
    priority: "vip",
  },
];

const interIslandConnectors: ConnectorLocation[] = Object.entries(locationDetails)
  .filter(([, location]) => location.type === "ferry")
  .map(([name, location]) => ({
    name,
    island: location.island,
    type: location.type,
  }));

const highPriorityAlerts: ServiceAlert[] = serviceAlerts.filter(
  (alert: ServiceAlert) => alert.severity !== "low"
);

const initialChecklist: DriverChecklist = {
  docsReady: false,
  vehicleChecked: false,
  fuelCharged: false,
  safetyKit: false,
};

function priorityClasses(priority: DriverTripCard["priority"]) {
  switch (priority) {
    case "vip":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "priority":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function statusClasses(status: DriverStatus) {
  switch (status) {
    case "online":
      return "bg-emerald-100 text-emerald-700";
    case "on_trip":
      return "bg-sky-100 text-sky-700";
    case "break":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function demandClasses(demand: string) {
  if (demand.toLowerCase() === "high") return "text-rose-600";
  if (demand.toLowerCase() === "growing") return "text-violet-600";
  return "text-emerald-600";
}

export default function DriverPortal() {
  const [checklist, setChecklist] = useState<DriverChecklist>(initialChecklist);
  const [driverStatus, setDriverStatus] = useState<DriverStatus>("online");
  const [shiftMode, setShiftMode] = useState<ShiftMode>("airport");

  const readinessScore = useMemo(() => {
    const completed = Object.values(checklist).filter(Boolean).length;
    return Math.round((completed / Object.keys(checklist).length) * 100);
  }, [checklist]);

  const readinessLabel = useMemo(() => {
    if (readinessScore === 100) return "Shift ready";
    if (readinessScore >= 75) return "Almost ready";
    if (readinessScore >= 50) return "Needs attention";
    return "Not ready";
  }, [readinessScore]);

  const filteredTrips = useMemo(() => {
    if (shiftMode === "airport") {
      return liveTrips.filter(
        (trip) =>
          trip.pickup.toLowerCase().includes("airport") ||
          trip.dropoff.toLowerCase().includes("airport")
      );
    }

    if (shiftMode === "ferry") {
      return liveTrips.filter(
        (trip) =>
          trip.pickup.toLowerCase().includes("ferry") ||
          trip.dropoff.toLowerCase().includes("ferry")
      );
    }

    if (shiftMode === "town") {
      return liveTrips.filter(
        (trip) =>
          trip.pickup.toLowerCase().includes("charlotte") ||
          trip.dropoff.toLowerCase().includes("charlotte")
      );
    }

    return liveTrips;
  }, [shiftMode]);

  const todayGross = 382.4;
  const tripsCompleted = 17;
  const acceptanceRate = 96;
  const driverRating = 4.97;
  const onlineHours = 6.4;

  function toggleChecklist(key: ChecklistKey) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="bg-gradient-to-r from-slate-950 via-sky-900 to-cyan-700 px-6 py-8 text-white md:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/90">
                Driver Operations
              </div>
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">
                Run your shift like a premium island operator
              </h2>
              <p className="mt-3 text-sm text-sky-50 md:text-base">
                Manage trip demand, readiness, high-priority routes, and
                real-time transport opportunities across the Virgin Islands.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] ${statusClasses(
                  driverStatus
                )}`}
              >
                {driverStatus.replace("_", " ")}
              </span>

              <select
                value={driverStatus}
                onChange={(e) => setDriverStatus(e.target.value as DriverStatus)}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white outline-none backdrop-blur"
              >
                <option value="offline" className="text-slate-900">
                  Offline
                </option>
                <option value="online" className="text-slate-900">
                  Online
                </option>
                <option value="on_trip" className="text-slate-900">
                  On trip
                </option>
                <option value="break" className="text-slate-900">
                  Break
                </option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid gap-8 p-6 md:p-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                  Today&apos;s earnings
                </span>
                <strong className="mt-3 block text-2xl font-black text-slate-900">
                  ${todayGross.toFixed(2)}
                </strong>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                  Trips completed
                </span>
                <strong className="mt-3 block text-2xl font-black text-slate-900">
                  {tripsCompleted}
                </strong>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                  Acceptance
                </span>
                <strong className="mt-3 block text-2xl font-black text-slate-900">
                  {acceptanceRate}%
                </strong>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                  Rating
                </span>
                <strong className="mt-3 block text-2xl font-black text-slate-900">
                  {driverRating} ★
                </strong>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                  Shift readiness
                </span>
                <strong className="mt-3 block text-2xl font-black text-slate-900">
                  {readinessScore}%
                </strong>
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  {readinessLabel}
                </div>
              </article>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <section className="rounded-3xl border border-slate-200 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Live trip queue
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Focus your shift around high-value island corridors.
                    </p>
                  </div>

                  <select
                    value={shiftMode}
                    onChange={(e) => setShiftMode(e.target.value as ShiftMode)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900"
                  >
                    <option value="airport">Airport</option>
                    <option value="town">Town</option>
                    <option value="ferry">Ferry</option>
                    <option value="flex">Flex</option>
                  </select>
                </div>

                <div className="mt-5 space-y-3">
                  {filteredTrips.map((trip) => (
                    <article
                      key={trip.id}
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-base font-black text-slate-900">
                            {trip.rider}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            {trip.pickup} → {trip.dropoff}
                          </div>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${priorityClasses(
                            trip.priority
                          )}`}
                        >
                          {trip.priority}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                            ETA
                          </div>
                          <div className="mt-1 font-bold text-slate-900">
                            {trip.eta}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                            Fare
                          </div>
                          <div className="mt-1 font-bold text-slate-900">
                            {trip.fare}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                            Mode
                          </div>
                          <div className="mt-1 font-bold capitalize text-slate-900">
                            {shiftMode}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
                        >
                          Accept trip
                        </button>
                        <button
                          type="button"
                          className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
                        >
                          View details
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 p-6">
                <h3 className="text-lg font-black text-slate-900">Quick actions</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Control your working mode and driver tools in one place.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="rounded-3xl bg-emerald-600 px-5 py-4 text-left text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    Go online
                  </button>
                  <button
                    type="button"
                    className="rounded-3xl bg-slate-900 px-5 py-4 text-left text-sm font-bold text-white hover:bg-slate-800"
                  >
                    Set destination filter
                  </button>
                  <button
                    type="button"
                    className="rounded-3xl bg-rose-600 px-5 py-4 text-left text-sm font-bold text-white hover:bg-rose-700"
                  >
                    Emergency support
                  </button>
                  <button
                    type="button"
                    className="rounded-3xl bg-violet-600 px-5 py-4 text-left text-sm font-bold text-white hover:bg-violet-700"
                  >
                    Weekly payout report
                  </button>
                </div>

                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    Shift summary
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="text-sm text-slate-500">Online hours</div>
                      <div className="mt-1 text-xl font-black text-slate-900">
                        {onlineHours}h
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Avg fare</div>
                      <div className="mt-1 text-xl font-black text-slate-900">
                        $22.49
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Peak zone</div>
                      <div className="mt-1 text-xl font-black text-slate-900">
                        Red Hook
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-3xl border border-slate-200 p-6">
              <h3 className="text-lg font-black text-slate-900">
                Pre-shift checklist
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Keep drivers compliant, safe, and operational before going live.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <span className="text-sm font-medium text-slate-800">
                    Driver docs + permit verified
                  </span>
                  <input
                    type="checkbox"
                    checked={checklist.docsReady}
                    onChange={() => toggleChecklist("docsReady")}
                  />
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <span className="text-sm font-medium text-slate-800">
                    Vehicle inspection completed
                  </span>
                  <input
                    type="checkbox"
                    checked={checklist.vehicleChecked}
                    onChange={() => toggleChecklist("vehicleChecked")}
                  />
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <span className="text-sm font-medium text-slate-800">
                    Fuel/charge level above 70%
                  </span>
                  <input
                    type="checkbox"
                    checked={checklist.fuelCharged}
                    onChange={() => toggleChecklist("fuelCharged")}
                  />
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <span className="text-sm font-medium text-slate-800">
                    Safety kit + first aid onboard
                  </span>
                  <input
                    type="checkbox"
                    checked={checklist.safetyKit}
                    onChange={() => toggleChecklist("safetyKit")}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 p-6">
              <h3 className="text-lg font-black text-slate-900">
                Island route planner
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Prioritize the routes with the best blend of demand and payout.
              </p>

              <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 font-bold text-slate-600">
                          Route
                        </th>
                        <th className="px-4 py-3 font-bold text-slate-600">
                          Best window
                        </th>
                        <th className="px-4 py-3 font-bold text-slate-600">
                          Demand
                        </th>
                        <th className="px-4 py-3 font-bold text-slate-600">
                          Avg fare
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {islandRoutes.map((route: IslandRoute) => (
                        <tr
                          key={route.route}
                          className="border-t border-slate-200 bg-white"
                        >
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {route.route}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {route.window}
                          </td>
                          <td className={`px-4 py-3 font-bold ${demandClasses(route.demand)}`}>
                            {route.demand}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {route.avgFare}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 p-6">
              <h3 className="text-lg font-black text-slate-900">Incentives</h3>
              <p className="mt-2 text-sm text-slate-600">
                Bonus programs and route priorities currently active.
              </p>

              <ul className="mt-5 space-y-3">
                {incentives.map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl border border-slate-200 p-6">
              <h3 className="text-lg font-black text-slate-900">
                Priority advisories
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Pay attention to service disruptions before accepting long routes.
              </p>

              <div className="mt-5 space-y-3">
                {highPriorityAlerts.map((alert: ServiceAlert) => (
                  <article
                    key={alert.id}
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-700">
                      {alert.severity} · {alert.island}
                    </div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {alert.title}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {alert.impact}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 p-6">
              <h3 className="text-lg font-black text-slate-900">
                Inter-island connectors
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Watch ferry hubs for synchronized demand and transfer traffic.
              </p>

              <ul className="mt-5 space-y-3">
                {interIslandConnectors.map((connector: ConnectorLocation) => (
                  <li
                    key={connector.name}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  >
                    <span className="font-semibold text-slate-900">
                      {connector.name}
                    </span>
                    <span className="text-slate-500"> · {connector.island}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}