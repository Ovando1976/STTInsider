"use client";

import { useState } from "react";
import { EstateExplorerMap } from "@/components/estates/estate-explorer-map";

type MapIslandValue = "all" | "stt" | "stj" | "stx";

export default function EstatesMapPage() {
  const [selectedIsland, setSelectedIsland] = useState<MapIslandValue>("all");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-[1600px]">
        <EstateExplorerMap
          selectedIsland={selectedIsland}
          onChangeIsland={setSelectedIsland}
        />
      </div>
    </main>
  );
}
