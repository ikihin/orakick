/**
 * TxLINE Free Tier Subscribe + Activate Script
 *
 * Cara pakai:
 * 1. Pastikan punya wallet devnet (file keypair JSON)
 * 2. Airdrop SOL: solana airdrop 2 --url devnet
 * 3. Jalankan: npx ts-node scripts/txline-subscribe.ts
 *
 * Setelah selesai, akan print API Token yang perlu ditaruh di .env.local
 */

import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";
import nacl from "tweetnacl";

// ========== CONFIG ==========
const NETWORK = "devnet";
const RPC_URL = "https://api.devnet.solana.com";
const API_ORIGIN = "https://txline-dev.txodds.com";
const PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const TXL_TOKEN_MINT = new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

const SERVICE_LEVEL_ID = 1; // World Cup & Int Friendlies (60s delay, FREE)
const DURATION_WEEKS = 4;
const SELECTED_LEAGUES: number[] = []; // Empty for standard bundle

// ========== MAIN ==========
async function main() {
  // Load wallet
  const walletPath = process.env.WALLET_PATH ||
    path.join(process.env.HOME || "~", ".config/solana/id.json");

  if (!fs.existsSync(walletPath)) {
    console.error(`❌ Wallet not found at: ${walletPath}`);
    console.error(`   Create one: solana-keygen new --outfile ${walletPath}`);
    console.error(`   Or set WALLET_PATH env var`);
    process.exit(1);
  }

  const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  console.log(`✅ Wallet: ${keypair.publicKey.toBase58()}`);

  // Connect
  const connection = new Connection(RPC_URL, "confirmed");
  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`✅ Balance: ${balance / 1e9} SOL`);

  if (balance < 0.01 * 1e9) {
    console.error("❌ Need at least 0.01 SOL for gas. Run: solana airdrop 2 --url devnet");
    process.exit(1);
  }

  // Setup Anchor
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Load IDL from on-chain
  console.log("📥 Fetching TxLINE program IDL...");
  const idl = await anchor.Program.fetchIdl(PROGRAM_ID, provider);
  if (!idl) {
    console.error("❌ Could not fetch IDL from chain. Program may not be deployed on devnet.");
    process.exit(1);
  }
  const program = new anchor.Program(idl, provider);
  console.log(`✅ Program loaded: ${program.programId.toBase58()}`);

  // Derive PDAs
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    PROGRAM_ID
  );

  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    TXL_TOKEN_MINT,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    PROGRAM_ID
  );

  // Create user TXL token account if not exists
  console.log("📦 Ensuring TXL token account exists...");
  const userAta = await getOrCreateAssociatedTokenAccount(
    connection,
    keypair,
    TXL_TOKEN_MINT,
    keypair.publicKey,
    false,
    "confirmed",
    undefined,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const userTokenAccount = userAta.address;
  console.log(`✅ TXL token account: ${userTokenAccount.toBase58()}`);

  // Step 2: Subscribe on-chain (FREE)
  console.log("\n🔗 Step 2: Subscribing on-chain (free tier)...");
  let txSig: string;
  try {
    txSig = await (program.methods as any)
      .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
      .accounts({
        user: keypair.publicKey,
        pricingMatrix: pricingMatrixPda,
        tokenMint: TXL_TOKEN_MINT,
        userTokenAccount,
        tokenTreasuryVault,
        tokenTreasuryPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`✅ Subscribe tx: ${txSig}`);
  } catch (err: any) {
    console.error("❌ Subscribe failed:", err.message);
    if (err.logs) console.error(err.logs.join("\n"));
    process.exit(1);
  }

  // Step 3: Get guest JWT
  console.log("\n🔑 Step 3: Getting guest JWT...");
  const authRes = await fetch(`${API_ORIGIN}/auth/guest/start`, { method: "POST" });
  if (!authRes.ok) {
    console.error("❌ Failed to get JWT:", authRes.status);
    process.exit(1);
  }
  const authData: any = await authRes.json();
  const jwt = authData.token;
  console.log(`✅ JWT obtained (expires in 30 days)`);

  // Step 4: Sign activation message
  console.log("\n✍️  Step 4: Signing activation message...");
  const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
  const message = new TextEncoder().encode(messageString);
  const signature = nacl.sign.detached(message, keypair.secretKey);
  const walletSignature = Buffer.from(signature).toString("base64");

  // Step 5: Activate API token
  console.log("\n🚀 Step 5: Activating API token...");
  const activateRes = await fetch(`${API_ORIGIN}/api/token/activate`, {
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

  const activateText = await activateRes.text();
  if (!activateRes.ok) {
    console.error(`❌ Activation failed (${activateRes.status}): ${activateText}`);
    process.exit(1);
  }

  let apiToken: string;
  try {
    const parsed = JSON.parse(activateText);
    apiToken = parsed.token || activateText;
  } catch {
    apiToken = activateText;
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 SUCCESS! Your TxLINE API Token:");
  console.log("=".repeat(60));
  console.log(apiToken);
  console.log("=".repeat(60));
  console.log("\nAdd this to your .env.local:");
  console.log(`TXLINE_API_TOKEN=${apiToken}`);
  console.log(`TXLINE_JWT=${jwt}`);
  console.log(`TXLINE_NETWORK=devnet`);
  console.log("\nToken valid for 4 weeks. Re-run this script to renew.");

  // Save to .env.local automatically
  const envPath = path.join(__dirname, "../.env.local");
  const envContent = `TXLINE_API_TOKEN=${apiToken}\nTXLINE_JWT=${jwt}\nTXLINE_NETWORK=devnet\n`;
  fs.writeFileSync(envPath, envContent);
  console.log(`\n✅ Saved to ${envPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
