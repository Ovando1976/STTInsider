"use client";

import type { Business, Review } from "@/types/stt";
import Image from "next/image";
import { safeImageSrc } from "@/lib/stt/safe-image";

interface Props {
  business: Business | null;
  reviews: Review[];
  onClose: () => void;
  onCheckIn: (businessId: string) => void;
  onAskConcierge: (business: Business) => void;
  onGetThere: (business: Business) => void;
}

export function BusinessModal({
  business,
  reviews,
  onClose,
  onCheckIn,
  onAskConcierge,
  onGetThere,
}: Props) {
  if (!business) return null;

  const businessReviews = reviews.filter((r) => r.businessId === business.id);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[40px] bg-white shadow-2xl">
        <div className="relative h-64 w-full md:h-72">
          <Image
            src={safeImageSrc(business.image)}
            alt={business.name}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
          <button
            onClick={onClose}
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-black/25 text-2xl font-bold text-white"
            aria-label="Close business details"
          >
            ×
          </button>
        </div>

        <div className="max-h-[calc(90vh-16rem)] overflow-y-auto p-6 md:max-h-[calc(90vh-18rem)] md:p-8">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                {business.name}
              </h2>
              <div className="mt-2 inline-flex rounded-lg bg-sky-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-sky-700">
                {business.category}
              </div>
            </div>

            <div className="text-xl font-bold text-amber-500 md:text-2xl">
              ★ {business.rating?.toFixed(1) ?? "5.0"}
            </div>
          </div>

          <div className="mb-6 grid gap-3 md:grid-cols-3">
            <button
              onClick={() => onAskConcierge(business)}
              className="rounded-[22px] bg-slate-900 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition hover:bg-slate-800"
            >
              Ask Concierge
            </button>

            <button
              onClick={() => onGetThere(business)}
              className="rounded-[22px] bg-sky-600 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition hover:bg-sky-700"
            >
              Get There
            </button>

            <button
              onClick={() => onCheckIn(business.id)}
              className="rounded-[22px] bg-amber-400 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-sky-950 shadow-xl transition hover:bg-amber-300"
            >
              Passport Stamp
            </button>
          </div>

          {(business.reserve || business.pickup) &&
            business.category === "Food" && (
              <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                {business.reserve ? (
                  <a
                    href={business.reserve}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center rounded-[22px] bg-sky-900 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl"
                  >
                    Reserve Table
                  </a>
                ) : (
                  <div />
                )}

                {business.pickup ? (
                  <a
                    href={business.pickup}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center rounded-[22px] bg-emerald-500 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl"
                  >
                    Order Pickup
                  </a>
                ) : (
                  <div />
                )}
              </div>
            )}

          <div className="mb-8 rounded-[28px] border border-slate-100 bg-slate-50 p-6">
            {business.richContent?.type === "Beach" && (
              <>
                <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-900">
                  Amenities
                </h4>
                <div className="flex flex-wrap gap-2">
                  {business.richContent.amenities.map((item) => (
                    <span
                      key={item}
                      className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600"
                    >
                      {item}
                    </span>
                  ))}
                  {business.richContent.fee && (
                    <span className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600">
                      Fee: {business.richContent.fee}
                    </span>
                  )}
                </div>
              </>
            )}

            {business.richContent?.type === "Menu" && (
              <>
                <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-900">
                  House Menu
                </h4>
                <div className="space-y-5">
                  {business.richContent.categories.map((section) => (
                    <div key={section.name}>
                      <div className="mb-2 text-xs font-black uppercase tracking-widest text-sky-700">
                        {section.name}
                      </div>
                      <div className="space-y-2">
                        {section.items.map((item) => (
                          <div
                            key={`${section.name}-${item.n}`}
                            className="flex items-center justify-between border-b border-dashed border-slate-200 pb-2 text-sm"
                          >
                            <span className="font-semibold text-slate-700">
                              {item.n}
                            </span>
                            <span className="font-bold text-slate-500">
                              {item.p}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {business.richContent?.type === "Shop" && (
              <>
                <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-900">
                  Featured Products
                </h4>
                <div className="space-y-2">
                  {business.richContent.products.map((product) => (
                    <div
                      key={product}
                      className="rounded-xl border bg-white px-4 py-3 text-sm font-bold text-slate-600"
                    >
                      {product}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <p className="mb-10 text-sm leading-7 text-slate-600">
            {business.description}
          </p>

          <div className="mb-10">
            <h4 className="mb-4 text-xs font-black uppercase tracking-widest text-slate-900">
              Recent Reviews
            </h4>

            <div className="space-y-3">
              {businessReviews.length === 0 ? (
                <p className="text-sm text-slate-400">No reviews yet.</p>
              ) : (
                businessReviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                        {review.userName}
                      </span>
                      <span className="text-[10px] font-bold text-amber-500">
                        {"★".repeat(review.score)}
                      </span>
                    </div>
                    <p className="text-sm italic text-slate-600">
                      “{review.text}”
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t pt-8 md:grid-cols-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                business.location
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center rounded-[22px] border-2 border-sky-600 py-4 text-[10px] font-black uppercase tracking-widest text-sky-600"
            >
              Open External Directions
            </a>

            <button
              onClick={() => onGetThere(business)}
              className="rounded-[22px] bg-sky-600 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition hover:bg-sky-700"
            >
              Book Ride to This Place
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}