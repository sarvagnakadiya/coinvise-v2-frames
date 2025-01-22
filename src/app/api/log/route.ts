import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, data } = body;

    // Server-side console log
    console.log("Server Log:", message);
    if (data) {
      console.log("Data:", JSON.stringify(data, null, 2));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logging Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
