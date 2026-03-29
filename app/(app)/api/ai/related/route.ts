import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    related: [],
    message: "AI related route stub is active.",
  });
}

export async function POST() {
  return NextResponse.json({
    ok: true,
    related: [],
    message: "AI related route stub is active.",
  });
}
