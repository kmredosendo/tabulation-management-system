import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // Accept eventId as query param
  // If eventId is provided, return only that event, else return all ACTIVE events
  const { searchParams } = new URL(req.url);
  const eventIdParam = searchParams.get("eventId");
  let events;
  if (eventIdParam) {
    const event = await prisma.event.findUnique({ where: { id: Number(eventIdParam) } });
    events = event ? [event] : [];
  } else {
    events = await prisma.event.findMany({
      where: { status: "ACTIVE" },
      orderBy: { date: "desc" },
    });
  }
  return NextResponse.json(events);
}