import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { name, weight, autoAssignToAllContestants, parentId } = await req.json();
  if (!name || !weight || !parentId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Get the parent criteria to get the eventId
  const parentCriteria = await prisma.criteria.findUnique({
    where: { id: Number(parentId) },
  });

  if (!parentCriteria) {
    return NextResponse.json({ error: "Parent criteria not found" }, { status: 404 });
  }

  const criteria = await prisma.criteria.create({
    data: {
      name,
      weight: Number(weight),
      eventId: parentCriteria.eventId,
      phase: parentCriteria.phase,
      parentId: Number(parentId),
      autoAssignToAllContestants: !!autoAssignToAllContestants,
    },
  });
  return NextResponse.json(criteria);
}