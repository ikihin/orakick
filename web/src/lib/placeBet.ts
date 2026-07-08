import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { IDL } from "./idl";

const PROGRAM_ID = new PublicKey("6cZmF2RJSN2KmYvCDLeiqMZvUFwasjpYY5anBhENnKPR");
const USDC_DEVNET_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

export async function placeBetOnChain(
  connection: Connection,
  wallet: any,
  matchId: number,
  predictionType: any,
  amountUsdc: number,
  teamA?: string,
  teamB?: string,
  kickoffTime?: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected");
  }

  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const program = new Program(IDL as any, provider);

  const matchIdBN = new BN(matchId);
  const [matchMarket] = PublicKey.findProgramAddressSync(
    [Buffer.from("match_market"), matchIdBN.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );

  // Check if match market exists on-chain, if not create it first
  const matchMarketInfo = await connection.getAccountInfo(matchMarket);
  if (!matchMarketInfo) {
    if (!teamA || !teamB || !kickoffTime) {
      throw new Error("Match market not yet created on-chain. Cannot auto-create without match details.");
    }
    const createTx = await (program.methods as any)
      .createMatch(matchIdBN, teamA, teamB, new BN(kickoffTime))
      .accounts({
        authority: wallet.publicKey,
        matchMarket,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    if (process.env.NODE_ENV !== "production") {
      console.log("Match market created:", createTx);
    }
    await connection.confirmTransaction(createTx, "confirmed");
  }

  const [prediction] = PublicKey.findProgramAddressSync(
    [Buffer.from("prediction"), matchMarket.toBuffer(), wallet.publicKey.toBuffer()],
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

  // Build transaction with setup instructions if needed
  const setupIxs: any[] = [];

  // Create user's USDC ATA if it doesn't exist
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

  // Create vault ATA (owned by matchMarket PDA) if it doesn't exist
  const vaultInfo = await connection.getAccountInfo(vault);
  if (!vaultInfo) {
    setupIxs.push(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        vault,
        matchMarket,
        USDC_DEVNET_MINT
      )
    );
  }

  // If there are setup instructions, send them first
  if (setupIxs.length > 0) {
    const setupTx = new Transaction().add(...setupIxs);
    setupTx.feePayer = wallet.publicKey;
    setupTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const signedSetup = await wallet.signTransaction(setupTx);
    const setupSig = await connection.sendRawTransaction(signedSetup.serialize());
    if (process.env.NODE_ENV !== "production") {
      console.log("Setup tx (create ATAs):", setupSig);
    }
    await connection.confirmTransaction(setupSig, "confirmed");
  }

  const amountBN = new BN(amountUsdc * 1_000_000);

  const tx = await (program.methods as any)
    .placePrediction(predictionType, amountBN)
    .accounts({
      user: wallet.publicKey,
      matchMarket,
      prediction,
      userTokenAccount,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}
