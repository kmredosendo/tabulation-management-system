import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Phase } from "@prisma/client";

// GET: Get all scores for a judge and event
export async function GET(req: NextRequest) {
  const judgeId = req.nextUrl.searchParams.get("judgeId");
  const eventId = req.nextUrl.searchParams.get("eventId");
  const phase = req.nextUrl.searchParams.get("phase") || "PRELIMINARY";
  if (!judgeId || !eventId) {
    return NextResponse.json({ error: "Missing judgeId or eventId" }, { status: 400 });
  }
  const scores = await prisma.score.findMany({
    where: { 
      judgeId: Number(judgeId), 
      eventId: Number(eventId),
      phase: phase as Phase
    },
  });
  return NextResponse.json(scores);
}

// POST: Save judge scores for contestants and sub-criteria
export async function POST(req: NextRequest) {
  const { judgeId, eventId, scores, phase } = await req.json();
  const scorePhase = phase || "PRELIMINARY";
  if (!judgeId || !eventId || !Array.isArray(scores)) {
    return NextResponse.json({ error: "Missing or invalid data" }, { status: 400 });
  }
  await prisma.score.deleteMany({
    where: {
      judgeId: Number(judgeId),
      eventId: Number(eventId),
      phase: scorePhase as Phase,
    },
  });
  // Create new scores
  const created = await prisma.score.createMany({
    data: (scores as { contestantId: number; subCriteriaId: number; value: number }[]).map(s => ({
      value: Number(s.value),
      contestantId: Number(s.contestantId),
      judgeId: Number(judgeId),
      criteriaId: Number(s.subCriteriaId),
      eventId: Number(eventId),
      phase: scorePhase as Phase,
    })),
  });
  return NextResponse.json({ success: true, count: created.count });
}