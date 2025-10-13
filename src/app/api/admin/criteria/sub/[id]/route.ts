import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, weight, autoAssignToAllContestants } = await req.json();
  if (!name || weight === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const criteria = await prisma.criteria.update({
    where: { id: Number(id) },
    data: {
      name,
      weight: Number(weight),
      autoAssignToAllContestants: !!autoAssignToAllContestants,
    },
  });
  return NextResponse.json(criteria);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.criteria.delete({
    where: { id: Number(id) },
  });
  return NextResponse.json({ success: true });
}