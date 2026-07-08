import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { IDL } from "./idl";
import { validateMatchOnChain, ValidateStatResult } from "./validateStat";

const PROGRAM_ID = new PublicKey("6cZmF2RJSN2KmYvCDLeiqMZvUFwasjpYY5anBhENnKPR");

export interface ResolveResult {
  validate: ValidateStatResult;
  resolveTxSig: string;
}

/**
 * Trustless match resolution:
 *   1. Client calls TxOracle.validate_stat with fixture Merkle proofs
 *      → returns verified home & away goal values on-chain.
 *   2. Client calls Orakick.resolve_match with those verified scores
 *      → market is closed and result is set.
 *
 * Both tx signatures are returned so the UI can display an audit trail.
 */
export async function resolveMatchWithProof(
  connection: Connection,
  wallet: any,
  matchId: number,
  fixtureId: number
): Promise<ResolveResult> {
  const validate = await validateMatchOnChain(connection, wallet, fixtureId);

  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const program = new Program(IDL as any, provider);

  const matchIdBN = new BN(matchId);
  const [matchMarket] = PublicKey.findProgramAddressSync(
    [Buffer.from("match_market"), matchIdBN.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );

  const resolveTxSig = await (program.methods as any)
    .resolveMatch(validate.scoreA, validate.scoreB)
    .accounts({
      authority: wallet.publicKey,
      matchMarket,
    })
    .rpc();

  await connection.confirmTransaction(resolveTxSig, "confirmed");

  return { validate, resolveTxSig };
}
