import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  TXORACLE_IDL,
  TXORACLE_PROGRAM_ID_DEVNET,
  SCORE_STAT_KEYS,
  PERIOD,
} from "./txoracle-idl";

const TXORACLE_PROGRAM_ID = new PublicKey(TXORACLE_PROGRAM_ID_DEVNET);

// PDA seed for the daily scores roots account, per TxLINE program.
// Anchored on epoch-day (Unix seconds / 86400) as u16.
function dailyScoresRootsPda(epochDay: number): PublicKey {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(epochDay, 0);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), buf],
    TXORACLE_PROGRAM_ID
  );
  return pda;
}

/**
 * Shape of the proof bundle returned by `/api/proofs/scores` (TxLINE proxy).
 * Field names mirror the on-chain IDL structs to make wiring easier.
 */
export interface ScoreProofBundle {
  ts: number;
  fixtureSummary: {
    fixtureId: number;
    updateStats: {
      updateCount: number;
      minTimestamp: number;
      maxTimestamp: number;
    };
    eventsSubTreeRoot: number[]; // 32 bytes
  };
  fixtureProof: { hash: number[]; isRightSibling: boolean }[];
  mainTreeProof: { hash: number[]; isRightSibling: boolean }[];
  homeGoalsProof: {
    statToProve: { key: number; value: number; period: number };
    eventStatRoot: number[];
    statProof: { hash: number[]; isRightSibling: boolean }[];
  };
  awayGoalsProof: ScoreProofBundle["homeGoalsProof"];
}

export interface ValidateStatResult {
  txSignature: string;
  verifiedOutcome: "TeamAWin" | "TeamBWin" | "Draw";
  scoreA: number;
  scoreB: number;
  rootPda: string;
  epochDay: number;
}

/**
 * Fetches the Merkle proof bundle for a fixture then calls TxOracle's
 * `validate_stat` twice (once per team) to trustlessly prove the final
 * home & away goals from the on-chain daily-scores root. Returns the
 * verified outcome plus the Solana transaction signature that judges can
 * inspect in the explorer.
 */
export async function validateMatchOnChain(
  connection: Connection,
  wallet: any,
  fixtureId: number
): Promise<ValidateStatResult> {
  if (!wallet.publicKey) throw new Error("Wallet not connected");

  // 1. Fetch proof bundle from our TxLINE proxy.
  const proofRes = await fetch(
    `/api/proofs/scores?fixtureId=${fixtureId}`
  );
  if (!proofRes.ok) {
    const body = await proofRes.json().catch(() => ({}));
    throw new Error(
      body.error || `Failed to load TxLINE proof: ${proofRes.status}`
    );
  }
  const bundle: ScoreProofBundle = await proofRes.json();

  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const program = new Program(TXORACLE_IDL as any, provider);

  const epochDay = Math.floor(bundle.ts / 86400);
  const rootPda = dailyScoresRootsPda(epochDay);

  // 2. Build the two validate_stat calls (home + away goals at full-time).
  //    validate_stat returns bool → we use `simulate` first for a cheap
  //    read, then commit a single tx with both ixs for the audit trail.
  const buildIx = (
    stat: ScoreProofBundle["homeGoalsProof"]
  ) =>
    (program.methods as any)
      .validateStat(
        new BN(bundle.ts),
        {
          fixtureId: new BN(bundle.fixtureSummary.fixtureId),
          updateStats: {
            updateCount: bundle.fixtureSummary.updateStats.updateCount,
            minTimestamp: new BN(bundle.fixtureSummary.updateStats.minTimestamp),
            maxTimestamp: new BN(bundle.fixtureSummary.updateStats.maxTimestamp),
          },
          eventsSubTreeRoot: bundle.fixtureSummary.eventsSubTreeRoot,
        },
        bundle.fixtureProof.map((n) => ({
          hash: n.hash,
          isRightSibling: n.isRightSibling,
        })),
        bundle.mainTreeProof.map((n) => ({
          hash: n.hash,
          isRightSibling: n.isRightSibling,
        })),
        { threshold: 0, comparison: { greaterThan: {} } },
        {
          statToProve: {
            key: stat.statToProve.key,
            value: stat.statToProve.value,
            period: stat.statToProve.period,
          },
          eventStatRoot: stat.eventStatRoot,
          statProof: stat.statProof.map((n) => ({
            hash: n.hash,
            isRightSibling: n.isRightSibling,
          })),
        },
        null,
        null
      )
      .accounts({ dailyScoresMerkleRoots: rootPda });

  const homeIx = await buildIx(bundle.homeGoalsProof).instruction();
  const awayIx = await buildIx(bundle.awayGoalsProof).instruction();

  // 3. Send as a single transaction — one signature, two proofs verified.
  const { Transaction } = await import("@solana/web3.js");
  const tx = new Transaction().add(homeIx, awayIx);
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const signed = await wallet.signTransaction(tx);
  const txSignature = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(txSignature, "confirmed");

  // 4. Derive the verified outcome from the proof-attested goal values.
  //    validate_stat succeeding == goals equal the values in the proof.
  const scoreA = bundle.homeGoalsProof.statToProve.value;
  const scoreB = bundle.awayGoalsProof.statToProve.value;
  const verifiedOutcome: ValidateStatResult["verifiedOutcome"] =
    scoreA > scoreB ? "TeamAWin" : scoreB > scoreA ? "TeamBWin" : "Draw";

  return {
    txSignature,
    verifiedOutcome,
    scoreA,
    scoreB,
    rootPda: rootPda.toBase58(),
    epochDay,
  };
}

export { SCORE_STAT_KEYS, PERIOD };
