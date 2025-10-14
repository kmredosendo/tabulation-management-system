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
        hasTwoPhases: true
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

    if (contestantIds.length !== event.finalistsCount) {
      return NextResponse.json({ 
        error: `Must select exactly ${event.finalistsCount} finalists` 
      }, { status: 400 });
    }

    // Verify all contestants exist and belong to this event
    const contestants = await prisma.contestant.findMany({
      where: {
        id: { in: contestantIds },
        eventId: eventId
      }
    });

    if (contestants.length !== contestantIds.length) {
      return NextResponse.json({ error: "One or more contestants not found" }, { status: 400 });
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