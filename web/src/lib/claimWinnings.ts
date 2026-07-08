import { Connection, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Transaction } from "@solana/web3.js";
import { IDL } from "./idl";

const PROGRAM_ID = new PublicKey("6cZmF2RJSN2KmYvCDLeiqMZvUFwasjpYY5anBhENnKPR");
const USDC_DEVNET_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

/**
 * Claim winnings for a resolved match. Contract validates the caller is the
 * predictor, that the market is Resolved, and that the prediction actually
 * won — then transfers USDC from the vault PDA to the user's ATA.
 */
export async function claimWinningsOnChain(
  connection: Connection,
  wallet: any,
  matchId: number
): Promise<string> {
  if (!wallet.publicKey) throw new Error("Wallet not connected");

  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  const program = new Program(IDL as any, provider);

  const matchIdBN = new BN(matchId);
  const [matchMarket] = PublicKey.findProgramAddressSync(
    [Buffer.from("match_market"), matchIdBN.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );

  const userTokenAccount = await getAssociatedTokenAddress(
    USDC_DEVNET_MINT,
    wallet.publicKey
  );
  const vault = await getAssociatedTokenAddress(
    USDC_DEVNET_MINT,
    matchMarket,
    true
  );

  const setupIxs: any[] = [];
  const userAtaInfo = await connection.getAccountInfo(userTokenAccount);
  if (!userAtaInfo) {
    setupIxs.push(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        userTokenAccount,
        wallet.publicKey,
        USDC_DEVNET_MINT
      )
    );
  }

  if (setupIxs.length > 0) {
    const setupTx = new Transaction().add(...setupIxs);
    setupTx.feePayer = wallet.publicKey;
    setupTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const signedSetup = await wallet.signTransaction(setupTx);
    const setupSig = await connection.sendRawTransaction(signedSetup.serialize());
    await connection.confirmTransaction(setupSig, "confirmed");
  }

  const tx = await (program.methods as any)
    .claimWinnings()
    .accounts({
      user: wallet.publicKey,
      matchMarket,
      userTokenAccount,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  await connection.confirmTransaction(tx, "confirmed");
  return tx;
}
