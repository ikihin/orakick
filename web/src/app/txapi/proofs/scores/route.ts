import { NextResponse } from "next/server";

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

/**
 * Proxies TxLINE score-validation endpoints. Judges and the frontend fetch
 * the Merkle proof bundle used by TxOracle.validate_stat here so they can
 * be inspected and replayed on-chain.
 *
 * GET /api/proofs/scores?fixtureId=<i64>&seq=<i32 optional>&statKeys=<csv optional>
 *
 * If `seq` is omitted, we auto-fetch the latest scores update for the
 * fixture and pick its sequence number so callers only need the fixtureId.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fixtureId = searchParams.get("fixtureId");
  let seq = searchParams.get("seq");
  const statKeys = searchParams.get("statKeys") || "1,2";
  const demo = searchParams.get("demo") === "1";

  if (!fixtureId) {
    return NextResponse.json(
      { error: "fixtureId query param required" },
      { status: 400 }
    );
  }

  // Deterministic demo payload — same shape as the real TxLINE response.
  // Used by the demo video / when a paid API token is not yet activated so
  // reviewers can still see the proof surface driving `validate_stat`.
  if (demo) {
    const zeros = new Array(32).fill(0);
    const nodes = (n = 3) =>
      Array.from({ length: n }).map((_, i) => ({
        hash: zeros.map((_, j) => (i * 32 + j) & 0xff),
        isRightSibling: i % 2 === 0,
      }));
    return NextResponse.json({
      mode: "demo",
      ts: 1_720_000_000,
      fixtureSummary: {
        fixtureId: Number(fixtureId),
        updateStats: {
          updateCount: 12,
          minTimestamp: 1_719_998_000,
          maxTimestamp: 1_720_005_400,
        },
        eventsSubTreeRoot: zeros,
      },
      fixtureProof: nodes(4),
      mainTreeProof: nodes(6),
      homeGoalsProof: {
        statToProve: { key: 1, value: 2, period: 0 },
        eventStatRoot: zeros,
        statProof: nodes(3),
      },
      awayGoalsProof: {
        statToProve: { key: 2, value: 1, period: 0 },
        eventStatRoot: zeros,
        statProof: nodes(3),
      },
    });
  }

  try {
    const jwt = await getJwt();
    if (!apiToken) {
      return NextResponse.json(
        {
          error: "TxLINE API token not configured",
          hint:
            "Run scripts/txline-subscribe.ts to activate. Append ?demo=1 to preview the payload shape.",
        },
        { status: 503 }
      );
    }

    // If seq isn't specified, pull the latest scores update for the fixture
    // and use its sequence number — this makes the endpoint idempotent for
    // callers that only know fixtureId (e.g. our /admin/resolve UI).
    if (!seq) {
      const updatesRes = await fetch(
        `${API_ORIGIN}/api/scores/historical/${fixtureId}`,
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
            "X-Api-Token": apiToken,
          },
        }
      );
      if (updatesRes.ok) {
        const text = await updatesRes.text();
        if (text.trim()) {
          try {
            const updates = JSON.parse(text);
            if (Array.isArray(updates) && updates.length > 0) {
              const last = updates[updates.length - 1];
              if (last?.Seq !== undefined) seq = String(last.Seq);
              else if (last?.seq !== undefined) seq = String(last.seq);
            }
          } catch (err) {
            console.warn("Failed to parse historical scores JSON:", err);
          }
        }
      }
      if (!seq) {
        return NextResponse.json(
          {
            error: "No score events found for fixture",
            hint:
              "This match likely hasn't kicked off yet, or scores haven't propagated. Append ?demo=1 to preview the proof shape, or wait for match start.",
            fixtureId,
          },
          { status: 404 }
        );
      }
    }

    const params = new URLSearchParams({
      fixtureId,
      seq,
      statKeys,
    });
    const res = await fetch(
      `${API_ORIGIN}/api/scores/stat-validation?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          "X-Api-Token": apiToken,
        },
      }
    );

    if (res.status === 401) {
      cachedJwt = null;
      return NextResponse.json({ error: "JWT expired, retry" }, { status: 401 });
    }

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: `TxLINE stat-validation error: ${res.status}`, body },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ ...data, _meta: { fixtureId, seq, statKeys } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "TxLINE API error";
    console.error("Proofs proxy error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
