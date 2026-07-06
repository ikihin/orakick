import { useCallback, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN, setProvider, Idl } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { IDL } from "./idl";

const PROGRAM_ID = new PublicKey("6cZmF2RJSN2KmYvCDLeiqMZvUFwasjpYY5anBhENnKPR");
const USDC_DEVNET_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

export function useOrakick() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    const p = new AnchorProvider(connection, wallet as any, {
      commitment: "confirmed",
    });
    setProvider(p);
    return p;
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    const idlWithAddress = { ...IDL, address: PROGRAM_ID.toBase58(), metadata: { name: "orakick", version: "0.1.0", spec: "0.1.0" } };
    return new Program(idlWithAddress as any, provider);
  }, [provider]);

  const getMatchMarketPDA = useCallback(
    (matchId: number) => {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("match_market"), new BN(matchId).toArrayLike(Buffer, "le", 8)],
        PROGRAM_ID
      );
      return pda;
    },
    []
  );

  const getPredictionPDA = useCallback(
    (matchMarket: PublicKey, user: PublicKey) => {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("prediction"), matchMarket.toBuffer(), user.toBuffer()],
        PROGRAM_ID
      );
      return pda;
    },
    []
  );

  const getVaultAddress = useCallback(
    async (matchMarket: PublicKey) => {
      return getAssociatedTokenAddress(USDC_DEVNET_MINT, matchMarket, true);
    },
    []
  );

  const placePrediction = useCallback(
    async (
      matchId: number,
      predictionType: any,
      amount: number
    ) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");

      const matchMarket = getMatchMarketPDA(matchId);
      const prediction = getPredictionPDA(matchMarket, wallet.publicKey);
      const userTokenAccount = await getAssociatedTokenAddress(
        USDC_DEVNET_MINT,
        wallet.publicKey
      );
      const vault = await getVaultAddress(matchMarket);

      const amountBN = new BN(amount * 1_000_000); // USDC has 6 decimals

      const tx = await program.methods
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
    },
    [program, wallet.publicKey, getMatchMarketPDA, getPredictionPDA, getVaultAddress]
  );

  const createMatch = useCallback(
    async (matchId: number, teamA: string, teamB: string, kickoffTime: number) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");

      const matchMarket = getMatchMarketPDA(matchId);

      const tx = await program.methods
        .createMatch(new BN(matchId), teamA, teamB, new BN(kickoffTime))
        .accounts({
          authority: wallet.publicKey,
          matchMarket,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return tx;
    },
    [program, wallet.publicKey, getMatchMarketPDA]
  );

  const fetchMatchMarket = useCallback(
    async (matchId: number) => {
      if (!program) return null;
      const matchMarket = getMatchMarketPDA(matchId);
      try {
        return await (program.account as any).matchMarket.fetch(matchMarket);
      } catch {
        return null;
      }
    },
    [program, getMatchMarketPDA]
  );

  return {
    program,
    provider,
    placePrediction,
    createMatch,
    fetchMatchMarket,
    getMatchMarketPDA,
    connected: !!provider,
    PROGRAM_ID,
    USDC_MINT: USDC_DEVNET_MINT,
  };
}
