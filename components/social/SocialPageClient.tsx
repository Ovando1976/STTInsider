"use client";

import Link from "next/link";
import {
  Heart,
  MessageCircle,
  PlusSquare,
  Search,
  Send,
  UserPlus,
} from "lucide-react";
import Image from "next/image";
import { safeImageSrc } from "@/lib/stt/safe-image";

const mockStories = [
  { id: "1", name: "Ava", avatar: "🌴" },
  { id: "2", name: "Malik", avatar: "🚕" },
  { id: "3", name: "Janelle", avatar: "🏝️" },
  { id: "4", name: "Nia", avatar: "🌊" },
  { id: "5", name: "Kofi", avatar: "☀️" },
];

const mockPosts = [
  {
    id: "p1",
    author: "STT Insider",
    handle: "@sttinsider",
    time: "2h",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    caption:
      "Sunset over Magens Bay tonight. Perfect weather for a beach run and dinner after.",
    likes: 248,
    comments: 32,
  },
  {
    id: "p2",
    author: "Island Eats",
    handle: "@islandeats",
    time: "5h",
    image:
      "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=1200&q=80",
    caption:
      "Fresh plates, local flavor, and a packed lunch crowd in Charlotte Amalie.",
    likes: 181,
    comments: 19,
  },
];

const creators = [
  {
    id: "c1",
    name: "Beach Vibes VI",
    niche: "Travel + beaches",
  },
  {
    id: "c2",
    name: "Taxi Talk STT",
    niche: "Transit updates",
  },
  {
    id: "c3",
    name: "Taste of STT",
    niche: "Food discovery",
  },
];

export default function SocialPageClient() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div className="mb-6 rounded-[32px] bg-gradient-to-r from-sky-600 via-cyan-500 to-blue-500 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.10)] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white/90">
              Social
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              USVI Social
            </h1>
            <p className="mt-3 text-sm text-sky-50 md:text-base">
              Share island moments, discover local creators, and follow what is
              happening across St. Thomas, St. John, and St. Croix.
            </p>
          </div>

          <div className="flex gap-3">
            <button className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-sky-700 shadow-sm hover:bg-sky-50">
              <PlusSquare className="h-4 w-4" />
              New Post
            </button>
            <Link
              href="/messages"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/20"
            >
              <Send className="h-4 w-4" />
              Messages
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 text-sm font-black text-slate-900">
              Navigation
            </div>
            <nav className="space-y-2 text-sm">
              <Link
                href="/social"
                className="block rounded-2xl bg-sky-50 px-4 py-3 font-semibold text-sky-700"
              >
                Feed
              </Link>
              <Link
                href="/community"
                className="block rounded-2xl px-4 py-3 text-slate-700 hover:bg-slate-50"
              >
                Community
              </Link>
              <Link
                href="/passport"
                className="block rounded-2xl px-4 py-3 text-slate-700 hover:bg-slate-50"
              >
                Passport
              </Link>
              <Link
                href="/transit"
                className="block rounded-2xl px-4 py-3 text-slate-700 hover:bg-slate-50"
              >
                Transit
              </Link>
            </nav>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-black text-slate-900">
              Trending topics
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                #MagensBay
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">#RedHook</div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">#STTFood</div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                #IslandNights
              </div>
            </div>
          </section>
        </aside>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search posts, creators, beaches, restaurants..."
                className="w-full bg-transparent text-sm text-slate-700 outline-none"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 text-sm font-black text-slate-900">
              Stories
            </div>
            <div className="flex gap-4 overflow-x-auto pb-1">
              {mockStories.map((story) => (
                <button
                  key={story.id}
                  className="flex min-w-[76px] flex-col items-center gap-2"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-sky-300 bg-sky-50 text-2xl">
                    {story.avatar}
                  </div>
                  <span className="text-xs font-semibold text-slate-700">
                    {story.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {mockPosts.map((post) => (
            <article
              key={post.id}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="font-black text-slate-900">{post.author}</div>
                  <div className="text-sm text-slate-500">
                    {post.handle} • {post.time}
                  </div>
                </div>
                <button className="rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Follow
                </button>
              </div>

              <div className="relative h-[320px] w-full">
                <Image
                  src={safeImageSrc(post.image)}
                  alt={post.caption}
                  fill
                  sizes="(max-width: 1280px) 100vw, 800px"
                  className="object-cover"
                />
              </div>

              <div className="px-5 py-4">
                <div className="mb-4 flex items-center gap-5 text-slate-700">
                  <button className="inline-flex items-center gap-2 text-sm font-semibold hover:text-rose-500">
                    <Heart className="h-4 w-4" />
                    {post.likes}
                  </button>
                  <button className="inline-flex items-center gap-2 text-sm font-semibold hover:text-sky-600">
                    <MessageCircle className="h-4 w-4" />
                    {post.comments}
                  </button>
                </div>

                <p className="text-sm leading-6 text-slate-700">
                  {post.caption}
                </p>
              </div>
            </article>
          ))}
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 text-sm font-black text-slate-900">
              Suggested creators
            </div>
            <div className="space-y-4">
              {creators.map((creator) => (
                <div
                  key={creator.id}
                  className="flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {creator.name}
                    </div>
                    <div className="text-sm text-slate-500">
                      {creator.niche}
                    </div>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
                    <UserPlus className="h-3.5 w-3.5" />
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-black text-slate-900">
              About this page
            </div>
            <p className="text-sm leading-6 text-slate-600">
              This can become your real social hub powered by Firestore
              collections like users, posts, follows, notifications, comments,
              and conversations.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
