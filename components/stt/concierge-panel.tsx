"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { UnifiedPlace } from "@/types/unified-place";

type ConciergePanelProps = {
  selectedPlace?: UnifiedPlace | null;
  initialPrompt?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  text: string;
};

type TripDuration = "2 hours" | "4 hours" | "full day";
type TripVibe = "adventure" | "luxury" | "family" | "local-casual";

type ConciergeProfile = {
  duration: TripDuration;
  vibe: TripVibe;
};

const QUICK_PROMPTS = [
  "Build me a half-day plan",
  "Find the best local lunch nearby",
  "What should I do before sunset?",
  "Create a rainy-day backup itinerary",
] as const;

const DURATIONS: TripDuration[] = ["2 hours", "4 hours", "full day"];
const VIBES: TripVibe[] = ["adventure", "luxury", "family", "local-casual"];

const DEFAULT_PROFILE: ConciergeProfile = {
  duration: "4 hours",
  vibe: "local-casual",
};

function buildAssistantReply(
  prompt: string,
  selectedPlace?: UnifiedPlace | null,
  profile: ConciergeProfile = DEFAULT_PROFILE,
) {
  const normalizedPrompt = prompt.toLowerCase();
  const placeLabel = selectedPlace?.title ?? "Charlotte Amalie";
  const islandLabel = selectedPlace?.island ?? "St. Thomas";

  const routeHint =
    Number.isFinite(selectedPlace?.lat) && Number.isFinite(selectedPlace?.lng)
      ? `Start near (${selectedPlace?.lat?.toFixed(4)}, ${selectedPlace?.lng?.toFixed(4)}) and keep each transfer under 20 minutes.`
      : `Anchor your route around central ${islandLabel} and cluster stops by area to reduce ride time.`;

  const profileHint = `Plan profile: ${profile.duration}, ${profile.vibe} vibe.`;

  if (normalizedPrompt.includes("rain") || normalizedPrompt.includes("indoor")) {
    return [
      `${profileHint} Weather-safe strategy around ${placeLabel}:`,
      `1) Indoor cultural stop\n2) Food-forward midday reset\n3) Covered or flexible late-afternoon option`,
      `${routeHint}\n\nIf the weather clears, I can add a fast scenic detour before sunset.`,
    ].join("\n\n");
  }

  if (normalizedPrompt.includes("sunset") || normalizedPrompt.includes("evening")) {
    return [
      `${profileHint} Sunset flow around ${placeLabel}:`,
      `• Golden-hour viewpoint 60–75 minutes before sunset\n• Dinner reservation 10–20 minutes away\n• Optional lounge/music finish based on energy level`,
      `Want this tuned for quiet, romantic, or social? I can produce all 3 variants in one pass.`,
    ].join("\n\n");
  }

  if (normalizedPrompt.includes("lunch") || normalizedPrompt.includes("food")) {
    return [
      `${profileHint} Food-first route around ${placeLabel}:`,
      `• Light experience first\n• Signature lunch stop\n• Nearby low-effort scenic follow-up`,
      `Share budget + cuisine preference and I will narrow this to 3 high-confidence options.`,
    ].join("\n\n");
  }

  return [
    `${profileHint} I’ll build a polished itinerary centered on ${placeLabel}, ${islandLabel}.`,
    `Suggested sequence: discovery stop → meal break → signature viewpoint → optional evening extension.`,
    `${routeHint}\n\nI can now optimize this for pace, comfort, kid-friendliness, or photo spots—pick one priority.`,
  ].join("\n\n");
}

function buildInitialMessages(
  selectedPlace?: UnifiedPlace | null,
  initialPrompt?: string,
  profile: ConciergeProfile = DEFAULT_PROFILE,
): ChatMessage[] {
  const intro = selectedPlace?.title
    ? `I’m your island concierge. I can design a seamless experience around ${selectedPlace.title}${
        selectedPlace.island ? `, ${selectedPlace.island}` : ""
      } with timing, pacing, and backup options.`
    : "Welcome to STT Concierge. Share your vibe and timeframe, and I’ll craft a route with food, activities, and transport flow.";

  const promptPreview =
    initialPrompt?.trim() ||
    (selectedPlace?.title
      ? `Help me plan the best experience around ${selectedPlace.title}.`
      : "");

  const messages: ChatMessage[] = [{ id: "intro", role: "ai", text: intro }];

  if (promptPreview) {
    messages.push({ id: "seed-user", role: "user", text: promptPreview });
    messages.push({
      id: "seed-ai",
      role: "ai",
      text: buildAssistantReply(promptPreview, selectedPlace, profile),
    });
  } else {
    messages.push({
      id: "seed-ai",
      role: "ai",
      text: "Try one of the quick prompts below, then tune duration/vibe for a more precise itinerary.",
    });
  }

  return messages;
}

export function ConciergePanel({
  selectedPlace,
  initialPrompt,
}: ConciergePanelProps) {
  const [profile, setProfile] = useState<ConciergeProfile>(DEFAULT_PROFILE);
  const messageCounter = useRef(0);

  const panelSeed = useMemo(
    () =>
      JSON.stringify({
        placeId: selectedPlace?.id,
        initialPrompt: initialPrompt?.trim() ?? "",
      }),
    [selectedPlace?.id, initialPrompt],
  );

  const initialMessages = useMemo(
    () => buildInitialMessages(selectedPlace, initialPrompt, profile),
    [selectedPlace, initialPrompt, profile],
  );

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setMessages(initialMessages);
    setDraft("");
  }, [initialMessages, panelSeed]);

  const nextId = (prefix: "user" | "ai") => {
    messageCounter.current += 1;
    return `${prefix}-${messageCounter.current}`;
  };

  const handleSubmit = (rawPrompt: string) => {
    const prompt = rawPrompt.trim();
    if (!prompt) {
      return;
    }

    const userMessage: ChatMessage = {
      id: nextId("user"),
      role: "user",
      text: prompt,
    };

    const aiMessage: ChatMessage = {
      id: nextId("ai"),
      role: "ai",
      text: buildAssistantReply(prompt, selectedPlace, profile),
    };

    setMessages((previous) => [...previous, userMessage, aiMessage]);
    setDraft("");
  };

  return (
    <div className="mx-auto flex h-[74vh] max-w-4xl flex-col overflow-hidden rounded-[40px] border border-slate-100 bg-white shadow-2xl">
      <div className="flex items-center gap-4 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-600 text-2xl text-white">
          ✨
        </div>
        <div className="min-w-0">
          <h3 className="font-black tracking-tight text-slate-900">Concierge</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
            Island Copilot
          </p>
          {selectedPlace?.title ? (
            <div className="mt-2 truncate text-sm font-medium text-slate-600">
              Planning around <span className="font-bold text-slate-900">{selectedPlace.title}</span>
            </div>
          ) : (
            <div className="mt-2 text-sm text-slate-500">Personalized plans in seconds</div>
          )}
        </div>
      </div>

      <div className="space-y-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
              onClick={() => handleSubmit(prompt)}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Duration
          </div>
          {DURATIONS.map((duration) => (
            <button
              key={duration}
              type="button"
              onClick={() => setProfile((prev) => ({ ...prev, duration }))}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                profile.duration === duration
                  ? "bg-sky-600 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              {duration}
            </button>
          ))}

          <div className="ml-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Vibe
          </div>
          {VIBES.map((vibe) => (
            <button
              key={vibe}
              type="button"
              onClick={() => setProfile((prev) => ({ ...prev, vibe }))}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                profile.vibe === vibe
                  ? "bg-sky-600 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              {vibe}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-8">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[90%] whitespace-pre-line rounded-[24px] px-5 py-4 text-sm leading-6 ${
              message.role === "user"
                ? "self-end rounded-br-md bg-sky-600 text-white"
                : "self-start rounded-bl-md bg-slate-100 text-slate-800"
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>

      <form
        className="flex gap-3 border-t bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit(draft);
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask for plans, food, sunset timing, weather backups, or transit flow..."
          className="flex-1 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-medium outline-none"
        />
        <button
          className="rounded-2xl bg-sky-600 px-5 py-4 text-white shadow-xl disabled:cursor-not-allowed disabled:bg-sky-300"
          type="submit"
          disabled={!draft.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}
