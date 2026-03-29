"use client";

import { SttFlowProvider } from "./stt-flow-context";
import { SttShell } from "./stt-shell";
import type { WeatherDay } from "@/types/stt";

const fallbackWeather: WeatherDay[] = [];

export default function SttPageClient() {
  return (
    <SttFlowProvider>
      <SttShell weather={fallbackWeather} />
    </SttFlowProvider>
  );
}
