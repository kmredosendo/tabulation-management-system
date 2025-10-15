import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { eventId, contestantIds } = await request.json();

    if (!eventId || !Array.isArray(contestantIds)) {
      return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
    }

    // Verify the event exists and uses manual selection
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { 
        id: true, 
        tieBreakingStrategy: true, 
        finalistsCount: true,
        currentPhase: true,
        hasTwoPhases: true,
        separateGenders: true
      }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.tieBreakingStrategy !== 'MANUAL_SELECTION') {
      return NextResponse.json({ error: "Event is not configured for manual selection" }, { status: 400 });
    }

    if (event.currentPhase !== 'PRELIMINARY') {
      return NextResponse.json({ error: "Manual selection only available during preliminary phase" }, { status: 400 });
    }

    // Verify all contestants exist and belong to this event
    const contestants = await prisma.contestant.findMany({
      where: {
        id: { in: contestantIds },
        eventId: eventId
      },
      select: {
        id: true,
        sex: true
      }
    });

    if (contestants.length !== contestantIds.length) {
      return NextResponse.json({ error: "One or more contestants not found" }, { status: 400 });
    }

    // Validate selection based on gender separation
    if (event.separateGenders) {
      // For gender-separated events, each gender should have exactly finalistsCount selections
      const maleContestants = contestants.filter(c => c.sex === 'MALE');
      const femaleContestants = contestants.filter(c => c.sex === 'FEMALE');

      if (maleContestants.length !== event.finalistsCount) {
        return NextResponse.json({ 
          error: `Must select exactly ${event.finalistsCount} male finalists (received ${maleContestants.length})` 
        }, { status: 400 });
      }

      if (femaleContestants.length !== event.finalistsCount) {
        return NextResponse.json({ 
          error: `Must select exactly ${event.finalistsCount} female finalists (received ${femaleContestants.length})` 
        }, { status: 400 });
      }

      // Total should be 2 * finalistsCount for gender-separated events
      if (contestantIds.length !== event.finalistsCount * 2) {
        return NextResponse.json({ 
          error: `Must select exactly ${event.finalistsCount * 2} finalists total for gender-separated events` 
        }, { status: 400 });
      }
    } else {
      // For non-gender-separated events, total should be finalistsCount
      if (contestantIds.length !== event.finalistsCount) {
        return NextResponse.json({ 
          error: `Must select exactly ${event.finalistsCount} finalists` 
        }, { status: 400 });
      }
    }

    // Delete existing manual selections for this event
    await prisma.manualFinalistSelection.deleteMany({
      where: { eventId: eventId }
    });

    // Create new manual selections
    const selections = await prisma.manualFinalistSelection.createMany({
      data: contestantIds.map((contestantId: number) => ({
        eventId: eventId,
        contestantId: contestantId
      }))
    });

    return NextResponse.json({ 
      success: true, 
      message: `Successfully selected ${selections.count} finalists`,
      selections: selections.count
    });

  } catch (error) {
    console.error("Error saving manual finalist selection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
    }

    const selections = await prisma.manualFinalistSelection.findMany({
      where: { eventId: parseInt(eventId) },
      include: {
        contestant: {
          select: {
            id: true,
            name: true,
            number: true,
            sex: true
          }
        }
      }
    });

    return NextResponse.json({ selections });

  } catch (error) {
    console.error("Error fetching manual finalist selections:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}