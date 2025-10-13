import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, identifier } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  const criteria = await prisma.criteria.update({
    where: { id: Number(id) },
    data: {
      name,
      identifier: identifier || null,
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