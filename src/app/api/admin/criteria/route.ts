import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Phase } from "@prisma/client";

// GET: List all main criteria and their sub-criteria for the selected event
export async function GET(req: NextRequest) {
  // Accept eventId and phase as query params
  const { searchParams } = new URL(req.url);
  const eventIdParam = searchParams.get("eventId");
  const phaseParam = searchParams.get("phase");
  let event;
  if (eventIdParam) {
    event = await prisma.event.findUnique({ where: { id: Number(eventIdParam) } });
  } else {
    event = await prisma.event.findFirst({ where: { status: "ACTIVE" }, orderBy: { date: "desc" } });
  }
  if (!event) return NextResponse.json({ error: "No event found" }, { status: 400 });

  // Build where clause - if phase is specified, filter by it, otherwise get all
  const whereClause: { eventId: number; parentId: null; phase?: Phase } = { eventId: event.id, parentId: null };
  if (phaseParam) {
    whereClause.phase = phaseParam as Phase;
  }

  // Get all main criteria and their sub-criteria for the event (and phase if specified)
  const mainCriterias = await prisma.criteria.findMany({
    where: whereClause,
    include: {
      subCriterias: true,
    },
    orderBy: { id: "asc" },
  });
  // Ensure identifier and phase are included in the response
  return NextResponse.json(mainCriterias.map((c: { id: number; name: string; identifier: string | null; eventId: number; phase: string; subCriterias: { id: number; name: string; identifier: string | null; eventId: number; weight: number | null; parentId: number | null; autoAssignToAllContestants: boolean; phase: string; }[] }) => ({ ...c, identifier: c.identifier, phase: c.phase })));
}

// POST: Create a main criteria
export async function POST(req: NextRequest) {
  const { name, identifier, eventId, phase } = await req.json();
  const criteriaPhase = phase || "PRELIMINARY";
  if (!name || !eventId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const criteria = await prisma.criteria.create({
    data: {
      name,
      identifier: identifier || null,
      eventId: Number(eventId),
      phase: criteriaPhase as Phase,
      parentId: null,
      weight: null,
      autoAssignToAllContestants: false,
    },
  });
  return NextResponse.json(criteria);
}