import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

type RouteParams = Promise<{ id: string }>;

// Helper to get current admin from session
async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  if (!session) return null;
  
  const admin = await prisma.admin.findUnique({
    where: { id: parseInt(session.value) },
  });
  return admin;
}

// PUT update user
export async function PUT(req: NextRequest, { params }: { params: RouteParams }) {
  try {
    const currentAdmin = await getCurrentAdmin();
    if (!currentAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    const { username, name } = await req.json();

    // Validate input
    if (!username || !name) {
      return NextResponse.json(
        { error: "Username and name are required" },
        { status: 400 }
      );
    }

    // Check if username already exists (excluding current user)
    const existing = await prisma.admin.findFirst({
      where: {
        username,
        NOT: { id: userId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await prisma.admin.update({
      where: { id: userId },
      data: { username, name },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
        createdBy: true,
        creator: {
          select: {
            name: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE user
export async function DELETE(req: NextRequest, { params }: { params: RouteParams }) {
  try {
    const currentAdmin = await getCurrentAdmin();
    if (!currentAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    // Prevent deleting yourself
    if (userId === currentAdmin.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Delete user
    await prisma.admin.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
