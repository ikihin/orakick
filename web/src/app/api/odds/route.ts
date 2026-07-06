import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TXLINE_API = "https://txline.txodds.com";

let cachedToken: string | null = null;

async function getToken() {
  if (cachedToken) return cachedToken;
  const res = await fetch(`${TXLINE_API}/guest/start`, { method: "POST" });
  const data = await res.json();
  cachedToken = data.token;
  return data.token;
}

export async function GET(request: NextRequest) {
  const fixtureId = request.nextUrl.searchParams.get("fixtureId");
  if (!fixtureId) {
    return NextResponse.json({ error: "fixtureId required" }, { status: 400 });
  }

  try {
    const token = await getToken();
    const res = await fetch(
      `${TXLINE_API}/guest/odds/snapshot/${fixtureId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch odds from TxLINE" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "TxLINE API error" }, { status: 500 });
  }
}
