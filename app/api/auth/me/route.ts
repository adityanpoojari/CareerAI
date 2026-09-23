import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("careerai_session")?.value;

  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    return NextResponse.json(
      { error: "Not logged in." },
      { status: 401 }
    );
  }

  return NextResponse.json({ user });
}