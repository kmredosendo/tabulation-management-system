import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  const where = eventId ? { eventId: Number(eventId) } : {};
  const contestants = await prisma.contestant.findMany({
    where,
    orderBy: { number: "asc" },
  });
  return NextResponse.json(contestants);
}

export async function POST(req: NextRequest) {
  const { number, name, sex, eventId } = await req.json();
  if (!number || !name || !eventId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const contestant = await prisma.contestant.create({
    data: {
      number: Number(number),
      name,
      sex: sex || null,
      eventId: Number(eventId),
    },
  });
  return NextResponse.json(contestant);
}