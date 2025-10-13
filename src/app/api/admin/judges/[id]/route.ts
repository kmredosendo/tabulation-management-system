import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = Promise<{ id: string }>;

// GET judge by ID
export async function GET(req: NextRequest, { params }: { params: RouteParams }) {
  const { id } = await params;
  const judgeId = Number(id);
  try {
    const judge = await prisma.judge.findUnique({ where: { id: judgeId } });
    if (!judge) {
      return NextResponse.json({ error: "Judge not found" }, { status: 404 });
    }
    return NextResponse.json(judge);
  } catch {
    return NextResponse.json({ error: "Failed to fetch judge" }, { status: 500 });
  }
}

// Update judge by ID
export async function PUT(req: NextRequest, { params }: { params: RouteParams }) {
  const { id } = await params;
  const judgeId = Number(id);
  const { number, name } = await req.json();
  if (!number || !name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  try {
    const judge = await prisma.judge.update({
      where: { id: judgeId },
      data: { number: Number(number), name },
    });
    return NextResponse.json(judge);
  } catch {
    return NextResponse.json({ error: "Failed to update judge" }, { status: 500 });
  }
}

// PATCH judge by ID (for partial updates like locking)
export async function PATCH(req: NextRequest, { params }: { params: RouteParams }) {
  const { id } = await params;
  const judgeId = Number(id);
  const updates = await req.json();
  
  try {
    const judge = await prisma.judge.update({
      where: { id: judgeId },
      data: updates,
    });

    // Emit real-time update for lock changes
    if (updates.lockedPreliminary !== undefined || updates.lockedFinal !== undefined) {
      // Get the judge with event info
      const judgeWithEvent = await prisma.judge.findUnique({
        where: { id: judgeId },
        include: { event: true }
      });

      if (judgeWithEvent?.event) {
        const eventId = judgeWithEvent.event.id;
        const phase = updates.lockedPreliminary !== undefined ? 'PRELIMINARY' : 'FINAL';
        const locked = updates.lockedPreliminary !== undefined ? updates.lockedPreliminary : updates.lockedFinal;

        // Emit the lock change to all judges in the event
        console.log(`Making HTTP request to emit judge lock change: /api/emit-judge-lock-change/${eventId}/${judgeId}/${phase}/${locked}`);
        fetch(`http://localhost:${process.env.PORT || 3000}/tabulation/api/emit-judge-lock-change/${eventId}/${judgeId}/${phase}/${locked}`)
          .catch(err => console.error('Failed to emit judge lock change:', err));
      }
    }

    return NextResponse.json(judge);
  } catch {
    return NextResponse.json({ error: "Failed to update judge" }, { status: 500 });
  }
}