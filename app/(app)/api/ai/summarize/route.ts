import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    summary: "",
    message: "AI summarize route stub is active.",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    summary: "",
    message: "AI summarize route stub is active.",
  });
}
