"use client";

import type { UnifiedPlace } from "@/types/unified-place";

type ConciergePanelProps = {
  selectedPlace?: UnifiedPlace | null;
  initialPrompt?: string;
};

export function ConciergePanel({
  selectedPlace,
  initialPrompt,
}: ConciergePanelProps) {
  const intro = selectedPlace?.title
    ? `I’m ready to help you plan around ${selectedPlace.title}${
        selectedPlace.island ? `, ${selectedPlace.island}` : ""
      }.`
    : "Welcome to STT Concierge. Ask me about beaches, food, shopping, plans, or local flow.";

  const promptPreview =
    initialPrompt?.trim() ||
    (selectedPlace?.title
      ? `Help me plan the best experience around ${selectedPlace.title}.`
      : "");

  const messages = [
    { role: "ai", text: intro },
    ...(promptPreview ? [{ role: "user", text: promptPreview }] : []),
    {
      role: "ai",
      text: selectedPlace?.title
        ? `I can help turn ${selectedPlace.title} into a real plan — what is nearby, when to go, and how to move through it smoothly.`
        : "Try asking for a beach day plan, a lunch spot, or the best route to your next stop.",
    },
  ];

  return (
    <div className="mx-auto flex h-[70vh] max-w-3xl flex-col overflow-hidden rounded-[40px] border border-slate-100 bg-white shadow-2xl">
      <div className="flex items-center gap-4 border-b border-sky-100 bg-sky-50 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-600 text-2xl text-white">
          ✨
        </div>
        <div>
          <h3 className="font-black tracking-tight text-slate-900">
            Concierge
          </h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">
            AI Island Assistant
          </p>
          {selectedPlace?.title ? (
            <div className="mt-2 text-sm font-medium text-slate-600">
              Planning around{" "}
              <span className="font-bold text-slate-900">
                {selectedPlace.title}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-8">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-[85%] rounded-[24px] px-5 py-4 text-sm leading-6 ${
              message.role === "user"
                ? "self-end rounded-br-md bg-sky-600 text-white"
                : "self-start rounded-bl-md bg-slate-100 text-slate-800"
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>

      <div className="flex gap-3 border-t bg-white p-5">
        <input
          type="text"
          defaultValue={promptPreview}
          placeholder="Ask about menus, beaches, nearby plans, or local flow..."
          className="flex-1 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-medium outline-none"
        />
        <button className="rounded-2xl bg-sky-600 px-5 py-4 text-white shadow-xl">
          🚀
        </button>
      </div>
    </div>
  );
}