import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Phase } from "@prisma/client";

// GET: Fetch talent scores for a specific judge and event
export async function GET(req: NextRequest) {
  const judgeId = req.nextUrl.searchParams.get("judgeId");
  const eventId = req.nextUrl.searchParams.get("eventId");
  const phase = req.nextUrl.searchParams.get("phase") || "PRELIMINARY";

  if (!judgeId || !eventId) {
    return NextResponse.json(
      { error: "Missing judgeId or eventId" },
      { status: 400 }
    );
  }

  try {
    // Get talent criteria for this event and phase
    const talentCriteria = await prisma.criteria.findMany({
      where: {
        eventId: Number(eventId),
        phase: phase as Phase,
        identifier: "best-in-talent",
      },
      include: {
        subCriterias: true,
      },
    });

    if (talentCriteria.length === 0) {
      return NextResponse.json({ scores: [], criteria: [] });
    }

    // Get all sub-criteria IDs
    const subCriteriaIds = talentCriteria.flatMap((c) =>
      c.subCriterias.map((sc) => sc.id)
    );

    // Fetch scores for this judge, event, and talent sub-criteria
    const scores = await prisma.score.findMany({
      where: {
        judgeId: Number(judgeId),
        eventId: Number(eventId),
        phase: phase as Phase,
        criteriaId: { in: subCriteriaIds },
      },
      include: {
        contestant: true,
        criteria: true,
      },
    });

    return NextResponse.json({
      scores,
      criteria: talentCriteria,
    });
  } catch (error) {
    console.error("Error fetching talent scores:", error);
    return NextResponse.json(
      { error: "Failed to fetch talent scores" },
      { status: 500 }
    );
  }
}

// POST: Save talent scores for a judge (admin-encoded)
export async function POST(req: NextRequest) {
  try {
    const { judgeId, eventId, scores, phase } = await req.json();
    const scorePhase = phase || "PRELIMINARY";

    if (!judgeId || !eventId || !Array.isArray(scores)) {
      return NextResponse.json(
        { error: "Missing or invalid data" },
        { status: 400 }
      );
    }

    // Get talent criteria for this event and phase
    const talentCriteria = await prisma.criteria.findMany({
      where: {
        eventId: Number(eventId),
        phase: scorePhase as Phase,
        identifier: "best-in-talent",
      },
      include: {
        subCriterias: true,
      },
    });

    if (talentCriteria.length === 0) {
      return NextResponse.json(
        { error: "No talent criteria found for this event" },
        { status: 404 }
      );
    }

    // Get all sub-criteria IDs
    const subCriteriaIds = talentCriteria.flatMap((c) =>
      c.subCriterias.map((sc) => sc.id)
    );

    // Delete existing talent scores for this judge and event
    await prisma.score.deleteMany({
      where: {
        judgeId: Number(judgeId),
        eventId: Number(eventId),
        phase: scorePhase as Phase,
        criteriaId: { in: subCriteriaIds },
      },
    });

    // Create new talent scores
    const created = await prisma.score.createMany({
      data: scores.map(
        (s: { contestantId: number; subCriteriaId: number; value: number }) => ({
          value: Number(s.value),
          contestantId: Number(s.contestantId),
          judgeId: Number(judgeId),
          criteriaId: Number(s.subCriteriaId),
          eventId: Number(eventId),
          phase: scorePhase as Phase,
        })
      ),
    });

    return NextResponse.json({ success: true, count: created.count });
  } catch (error) {
    console.error("Error saving talent scores:", error);
    return NextResponse.json(
      { error: "Failed to save talent scores" },
      { status: 500 }
    );
  }
}
