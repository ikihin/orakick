const NETWORK: string = "devnet";
const API_ORIGIN =
  NETWORK === "mainnet"
    ? "https://txline.txodds.com"
    : "https://txline-dev.txodds.com";

let cachedJwt: string | null = null;

export async function getGuestToken(): Promise<string> {
  if (cachedJwt) return cachedJwt;
  const res = await fetch(`${API_ORIGIN}/auth/guest/start`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to get guest JWT");
  const data = await res.json();
  cachedJwt = data.token;
  return data.token;
}

export interface Fixture {
  Ts: number;
  StartTime: number;
  Competition: string;
  CompetitionId: number;
  FixtureGroupId: number;
  FixtureId: number;
  Participant1: string;
  Participant1Id: number;
  Participant2: string;
  Participant2Id: number;
  Participant1IsHome: boolean;
}

export interface OddsUpdate {
  FixtureId: number;
  MessageId: string;
  Ts: number;
  Bookmaker: string;
  BookmakerId: number;
  SuperOddsType: string;
  GameState: string;
  InRunning: boolean;
  PriceNames: string[];
  Prices: number[];
}

export async function getFixtures(apiToken: string): Promise<Fixture[]> {
  const jwt = await getGuestToken();
  const res = await fetch(`${API_ORIGIN}/api/fixtures/snapshot`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      "X-Api-Token": apiToken,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch fixtures: ${res.status}`);
  return res.json();
}

export async function getOdds(fixtureId: number, apiToken: string): Promise<OddsUpdate[]> {
  const jwt = await getGuestToken();
  const res = await fetch(`${API_ORIGIN}/api/odds/snapshot/${fixtureId}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      "X-Api-Token": apiToken,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch odds: ${res.status}`);
  return res.json();
}

export function createOddsStream(
  apiToken: string,
  onData: (data: OddsUpdate) => void,
  onError?: (err: Event) => void
): EventSource | null {
  if (typeof window === "undefined") return null;

  const jwt = cachedJwt;
  if (!jwt || !apiToken) return null;

  const es = new EventSource(
    `${API_ORIGIN}/api/odds/stream?token=${jwt}&apiToken=${apiToken}`
  );

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onData(data);
    } catch (err) {
      console.error("Failed to parse TxLINE odds stream event:", err);
    }
  };

  if (onError) es.onerror = onError;

  return es;
}

export function formatOdds(price: number): string {
  return (price / 100).toFixed(2);
}

export function get1X2Odds(odds: OddsUpdate[]): {
  home: number;
  draw: number;
  away: number;
  bookmaker: string;
} | null {
  const match1x2 = odds.find((o) => o.SuperOddsType === "1X2" && !o.InRunning);
  if (!match1x2 || match1x2.Prices.length < 3) return null;

  return {
    home: match1x2.Prices[0] / 100,
    draw: match1x2.Prices[1] / 100,
    away: match1x2.Prices[2] / 100,
    bookmaker: match1x2.Bookmaker,
  };
}
