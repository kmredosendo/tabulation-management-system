import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Phase } from "@prisma/client";

// Returns all raw scores for the selected event, grouped by contestant and judge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventIdParam = searchParams.get("eventId");
  const phaseParam = searchParams.get("phase");
  let event;
  if (eventIdParam) {
    event = await prisma.event.findUnique({
      where: { id: Number(eventIdParam) },
      select: {
        id: true,
        name: true,
        date: true,
        institutionName: true,
        institutionAddress: true,
        venue: true,
        separateGenders: true,
        hasTwoPhases: true,
        currentPhase: true,
        finalistsCount: true,
      },
    });
  } else {
    event = await prisma.event.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { date: "desc" },
      select: {
        id: true,
        name: true,
        date: true,
        institutionName: true,
        institutionAddress: true,
        venue: true,
        separateGenders: true,
        hasTwoPhases: true,
        currentPhase: true,
        finalistsCount: true,
      },
    });
  }
  if (!event) return NextResponse.json([]);

  // Get all contestants and judges for the event
  const [contestants, judges, criteria] = await Promise.all([
    prisma.contestant.findMany({ where: { eventId: event.id } }),
    prisma.judge.findMany({ where: { eventId: event.id } }),
    prisma.criteria.findMany({ 
      where: { 
        eventId: event.id, 
        ...(phaseParam && { phase: phaseParam as Phase })
      } 
    }),
  ]);

  // Get all scores for the event
  const scores = await prisma.score.findMany({
    where: { 
      eventId: event.id, 
      ...(phaseParam && { phase: phaseParam as Phase })
    },
    include: { contestant: true, judge: true, criteria: true },
  });

  // Structure: [{ contestantId, contestantName, judgeId, judgeNumber, judgeName, criteriaId, criteriaName, value }]
  const raw = scores.map((s: {
    id: number;
    value: number;
    contestantId: number;
    judgeId: number;
    criteriaId: number;
    contestant: { name: string };
    judge: { number: number; name: string };
    criteria: { name: string; identifier: string | null };
  }) => ({
    contestantId: s.contestantId,
    contestantName: s.contestant.name,
    judgeId: s.judgeId,
    judgeNumber: s.judge.number,
    judgeName: s.judge.name,
    criteriaId: s.criteriaId,
    criteriaName: s.criteria.name,
    criteriaIdentifier: s.criteria.identifier,
    value: s.value,
  }));

  return NextResponse.json({
    event,
    contestants,
    judges,
    criteria,
    scores: raw,
  });
}