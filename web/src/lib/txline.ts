const TXLINE_API = "https://txline.txodds.com";

let cachedToken: string | null = null;

export async function getGuestToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const res = await fetch(`${TXLINE_API}/guest/start`, {
    method: "POST",
  });
  const data = await res.json();
  cachedToken = data.token;
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

export async function getFixtures(): Promise<Fixture[]> {
  const token = await getGuestToken();
  const res = await fetch(`${TXLINE_API}/guest/fixtures/snapshot`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch fixtures");
  return res.json();
}

export async function getOdds(fixtureId: number): Promise<OddsUpdate[]> {
  const token = await getGuestToken();
  const res = await fetch(`${TXLINE_API}/guest/odds/snapshot/${fixtureId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch odds");
  return res.json();
}

export function createOddsStream(
  onData: (data: OddsUpdate) => void,
  onError?: (err: Event) => void
): EventSource | null {
  if (typeof window === "undefined") return null;

  const token = cachedToken;
  if (!token) return null;

  const es = new EventSource(
    `${TXLINE_API}/guest/odds/stream?token=${token}`
  );

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onData(data);
    } catch {}
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
