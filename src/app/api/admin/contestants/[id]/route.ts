import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { number, name, sex } = await req.json();
  const { id } = await params;
  if (!number || !name || !id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const contestant = await prisma.contestant.update({
    where: { id: Number(id) },
    data: {
      number: Number(number),
      name,
      sex: sex || null,
    },
  });
  return NextResponse.json(contestant);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await prisma.contestant.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}