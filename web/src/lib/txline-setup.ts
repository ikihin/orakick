import {
  Connection,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";

const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

const CONFIG = {
  devnet: {
    rpcUrl: "https://api.devnet.solana.com",
    apiOrigin: "https://txline-dev.txodds.com",
    programId: new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
    txlTokenMint: new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
  },
  mainnet: {
    rpcUrl: "https://api.mainnet-beta.solana.com",
    apiOrigin: "https://txline.txodds.com",
    programId: new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"),
    txlTokenMint: new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL"),
  },
} as const;

export const TXLINE_CONFIG = CONFIG.devnet;

export const SERVICE_LEVEL_ID = 1; // World Cup & Int Friendlies (60s delay)
export const DURATION_WEEKS = 4;
export const SELECTED_LEAGUES: number[] = [];

export async function subscribeTxLine(
  program: Program<any>,
  provider: AnchorProvider
) {
  const { txlTokenMint, programId } = TXLINE_CONFIG;

  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    programId
  );

  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    txlTokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    programId
  );

  const userTokenAccount = getAssociatedTokenAddressSync(
    txlTokenMint,
    provider.wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const txSig = await (program.methods as any)
    .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
    .accounts({
      user: provider.wallet.publicKey,
      pricingMatrix: pricingMatrixPda,
      tokenMint: txlTokenMint,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return txSig;
}

export async function activateTxLine(
  txSig: string,
  jwt: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<string> {
  const { apiOrigin } = TXLINE_CONFIG;
  const apiBaseUrl = `${apiOrigin}/api`;

  const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
  const message = new TextEncoder().encode(messageString);
  const signatureBytes = await signMessage(message);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");

  const res = await fetch(`${apiBaseUrl}/token/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      txSig,
      walletSignature,
      leagues: SELECTED_LEAGUES,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Activation failed: ${res.status} - ${text}`);
  }

  const data = await res.json().catch(() => res.text());
  return typeof data === "string" ? data : data.token;
}

export async function getGuestJwt(): Promise<string> {
  const { apiOrigin } = TXLINE_CONFIG;
  const res = await fetch(`${apiOrigin}/auth/guest/start`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to get guest JWT");
  const data = await res.json();
  return data.token;
}
