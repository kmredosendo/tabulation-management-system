import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all judges for the current event
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  const where = eventId ? { eventId: Number(eventId) } : {};
  const judges = await prisma.judge.findMany({
    where,
    orderBy: { number: "asc" },
  });
  return NextResponse.json(judges);
}

export async function POST(req: NextRequest) {
  const { number, name, eventId } = await req.json();
  if (!number || !name || !eventId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const judge = await prisma.judge.create({
    data: {
      number: Number(number),
      name,
      eventId: Number(eventId),
    },
  });
  return NextResponse.json(judge);
}