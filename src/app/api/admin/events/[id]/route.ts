import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const event = await prisma.event.findUnique({ where: { id: Number(id) } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json(event);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { name, date, status, institutionName, institutionAddress, venue, separateGenders, finalistsCount, hasTwoPhases, tieBreakingStrategy } = await req.json();
  const { id } = await params;
  if (!name || !date || !id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const event = await prisma.event.update({
    where: { id: Number(id) },
    data: {
      name,
      date: new Date(date),
      institutionName,
      institutionAddress,
      venue,
      ...(status && { status }),
      ...(separateGenders !== undefined && { separateGenders }),
      ...(finalistsCount !== undefined && { finalistsCount }),
      ...(hasTwoPhases !== undefined && { hasTwoPhases }),
      ...(tieBreakingStrategy && { tieBreakingStrategy })
    },
  });
  return NextResponse.json(event);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { currentPhase } = await req.json();
  const { id } = await params;
  if (!id || !currentPhase) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const event = await prisma.event.update({
    where: { id: Number(id) },
    data: { currentPhase },
  });

  // Emit phase change event to all judges in this event
  try {
    console.log(`Making HTTP request to emit phase change: /api/emit-phase-change/${id}/${currentPhase}`);
    // Call the server's phase change endpoint with base path
    const response = await fetch(`http://localhost:${process.env.PORT || 3000}/tabulation/api/emit-phase-change/${id}/${currentPhase}`, {
      method: 'POST'
    });
    console.log(`Phase change HTTP response:`, response.status);
  } catch (error) {
    console.error('Failed to emit phase change:', error);
  }

  return NextResponse.json(event);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await prisma.event.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}