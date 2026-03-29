import type { Business, Review } from "@/types/stt";

export const STT_BUSINESSES: Business[] = [
  {
    id: "stt-magens",
    name: "Magens Bay",
    category: "Beach",
    featured: true,
    rating: 4.8,
    openTime: 8,
    closeTime: 17,
    lat: 18.3601,
    lng: -64.9254,
    location: "Magens Bay Rd",
    image: "/images/magens-bay.jpg",
    description:
      "Voted one of the Caribbean’s most iconic beaches with calm water and wide sand.",
    richContent: {
      type: "Beach",
      amenities: ["Lifeguards", "Bar", "Showers"],
      fee: "$5",
    },
  },
  {
    id: "stt-lindquist",
    name: "Lindquist Beach",
    category: "Beach",
    featured: true,
    rating: 4.9,
    openTime: 8,
    closeTime: 17,
    lat: 18.3458,
    lng: -64.8624,
    location: "Smith Bay Park",
    image: "/images/lindquist-beach.jpg",
    description:
      "A pristine white-sand beach with a quieter, more natural atmosphere.",
    richContent: {
      type: "Beach",
      amenities: ["Picnic Tables"],
      fee: "$5",
    },
  },
  {
    id: "stt-coki",
    name: "Coki Beach",
    category: "Beach",
    rating: 4.7,
    lat: 18.3491,
    lng: -64.8661,
    location: "Coki Point",
    image: "/images/coki-beach.jpg",
    description:
      "A lively snorkeling beach with vendors, food, and easy water access.",
    richContent: {
      type: "Beach",
      amenities: ["Snorkel Gear", "Bars"],
      fee: "Free",
    },
  },
  {
    id: "stt-sapphire",
    name: "Sapphire Beach",
    category: "Beach",
    featured: true,
    rating: 4.8,
    lat: 18.3347,
    lng: -64.8505,
    location: "Sapphire Beach Resort",
    image: "/images/sapphire-beach.jpg",
    description:
      "A scenic beach with clear water, watersports, and views toward nearby islands.",
    richContent: {
      type: "Beach",
      amenities: ["Watersports", "Music"],
      fee: "Free",
    },
  },
  {
    id: "stt-gladys",
    name: "Gladys' Cafe",
    category: "Food",
    featured: true,
    rating: 4.9,
    openTime: 7,
    closeTime: 15,
    lat: 18.3415,
    lng: -64.9315,
    location: "Charlotte Amalie",
    image: "/images/gladys-cafe.jpg",
    description:
      "Authentic Caribbean flavors and one of the most recognizable local dining stops.",
    pickup: "tel:3407746604",
    richContent: {
      type: "Menu",
      categories: [
        {
          name: "Lunch",
          items: [
            { n: "Curry Goat", p: "$19" },
            { n: "Fungi", p: "$12" },
          ],
        },
      ],
    },
  },
  {
    id: "stt-osf",
    name: "Old Stone Farmhouse",
    category: "Food",
    featured: true,
    rating: 4.9,
    openTime: 17,
    closeTime: 22,
    lat: 18.358,
    lng: -64.915,
    location: "Mahogany Run",
    image: "/images/old-stone-farmhouse.jpg",
    description: "Upscale dining in a beautifully restored historic setting.",
    reserve: "https://www.opentable.com/",
    richContent: {
      type: "Menu",
      categories: [
        {
          name: "Dinner",
          items: [
            { n: "Filet", p: "$52" },
            { n: "Ribeye", p: "$58" },
          ],
        },
      ],
    },
  },
  {
    id: "stt-greengos",
    name: "Greengos Cantina",
    category: "Food",
    featured: true,
    rating: 4.7,
    openTime: 11,
    closeTime: 21,
    lat: 18.341,
    lng: -64.931,
    location: "Charlotte Amalie",
    image: "/images/greengos.jpg",
    description:
      "Popular casual spot for tacos, margaritas, and a lively downtown vibe.",
    pickup: "https://www.greengoscantina.com/",
    richContent: {
      type: "Menu",
      categories: [
        {
          name: "Tacos",
          items: [{ n: "Fish Tacos", p: "$15" }],
        },
      ],
    },
  },
  {
    id: "stt-ahr",
    name: "AH Riise Mall",
    category: "Shopping",
    featured: true,
    rating: 4.7,
    lat: 18.3412,
    lng: -64.932,
    location: "Charlotte Amalie",
    image: "/images/place-card.png",
    description:
      "Duty-free shopping hub for jewelry, gifts, and premium brands.",
    richContent: {
      type: "Shop",
      products: ["Watches", "Rum", "Jewelry"],
    },
  },
];

export const STT_REVIEWS: Review[] = [
  {
    id: "r1",
    businessId: "stt-magens",
    userName: "Verified Visitor",
    score: 5,
    text: "Beautiful beach and easy for families.",
    timestamp: 1709942400000,
  },
  {
    id: "r2",
    businessId: "stt-gladys",
    userName: "Island Foodie",
    score: 5,
    text: "Excellent local food and full of character.",
    timestamp: 1709856000000,
  },
];
