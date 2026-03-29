import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "AI route stub is active.",
  });
}

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "AI route stub is active.",
  });
}
