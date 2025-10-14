import { NextRequest, NextResponse } from "next/server";

type RouteParams = Promise<{ id: string }>;

// POST judge logout (remove from active judges list)
export async function POST(req: NextRequest, { params }: { params: RouteParams }) {
  const { id } = await params;
  const judgeId = Number(id);
  
  try {
    // Make HTTP request to server to force disconnect the judge's socket
    const port = process.env.PORT || 3000;
    const url = `http://localhost:${port}/tabulation/api/judge-logout/${judgeId}`;
    
    console.log(`Making HTTP request to logout judge: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      console.error('Failed to logout judge via socket server');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Judge logout error:', error);
    return NextResponse.json({ error: "Failed to logout judge" }, { status: 500 });
  }
}