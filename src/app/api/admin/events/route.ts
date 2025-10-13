import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { name, date, institutionName, institutionAddress, venue, separateGenders, finalistsCount, hasTwoPhases } = await req.json();
  if (!name || !date) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  // Create new event (default to ACTIVE, or you can set to INACTIVE if needed)
  const event = await prisma.event.create({
    data: {
      name,
      date: new Date(date),
      institutionName,
      institutionAddress,
      venue,
      hasTwoPhases: hasTwoPhases !== undefined ? hasTwoPhases : false,
      separateGenders: separateGenders || false,
      finalistsCount: finalistsCount ?? 0,
      status: "ACTIVE"
    },
  });
  return NextResponse.json(event);
}

export async function GET() {
  const events = await prisma.event.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json(events);
}