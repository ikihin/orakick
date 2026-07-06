import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const NETWORK = process.env.TXLINE_NETWORK || "devnet";
const API_ORIGIN =
  NETWORK === "mainnet"
    ? "https://txline.txodds.com"
    : "https://txline-dev.txodds.com";

let cachedJwt: string | null = process.env.TXLINE_JWT || null;
const apiToken = process.env.TXLINE_API_TOKEN || null;

async function getJwt() {
  if (cachedJwt) return cachedJwt;
  const res = await fetch(`${API_ORIGIN}/auth/guest/start`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to get guest JWT");
  const data = await res.json();
  cachedJwt = data.token;
  return data.token;
}

export async function GET(request: NextRequest) {
  const fixtureId = request.nextUrl.searchParams.get("fixtureId");
  if (!fixtureId) {
    return NextResponse.json({ error: "fixtureId required" }, { status: 400 });
  }

  try {
    if (!apiToken) {
      return NextResponse.json(
        { error: "TxLINE API token not configured" },
        { status: 503 }
      );
    }

    const jwt = await getJwt();
    const res = await fetch(
      `${API_ORIGIN}/api/odds/snapshot/${fixtureId}`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          "X-Api-Token": apiToken,
        },
        next: { revalidate: 60 },
      }
    );

    if (res.status === 401) {
      cachedJwt = null;
      return NextResponse.json({ error: "JWT expired" }, { status: 401 });
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `TxLINE odds error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "TxLINE API error" },
      { status: 500 }
    );
  }
}
