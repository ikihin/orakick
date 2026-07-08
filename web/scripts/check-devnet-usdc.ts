/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Devnet USDC helper for Orakick reviewers.
 *
 * The mint address hard-coded in Orakick
 * (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`) is the community
 * "standard" devnet USDC — the mint authority belongs to Circle, so we
 * can't mint it ourselves. This script:
 *
 *   1. Reads a Solana pubkey (from RECIPIENT env var or the local
 *      scripts/.txline-keypair.json).
 *   2. Reports whether the wallet has any devnet SOL + USDC.
 *   3. If USDC balance is zero, prints the Circle faucet URL + copy-paste
 *      steps to get 10 USDC.
 *
 * Usage:
 *   RECIPIENT=<phantom pubkey>  npx tsx web/scripts/check-devnet-usdc.ts
 *
 * If you'd rather run an OWN mint (so you don't rely on Circle's faucet),
 * follow the guide printed at the end.
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "node:fs";
import path from "node:path";

const RPC_URL = "https://api.devnet.solana.com";
const USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);
const KEYPAIR_PATH = path.join(__dirname, ".txline-keypair.json");

function resolveRecipient(): PublicKey {
  if (process.env.RECIPIENT) return new PublicKey(process.env.RECIPIENT);
  if (fs.existsSync(KEYPAIR_PATH)) {
    const secret = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8"));
    return Keypair.fromSecretKey(Uint8Array.from(secret)).publicKey;
  }
  throw new Error(
    "Set RECIPIENT=<pubkey> env var or run scripts/txline-subscribe.ts first to bootstrap a keypair."
  );
}

async function main() {
  const recipient = resolveRecipient();
  console.log(`Recipient wallet: ${recipient.toBase58()}\n`);

  const connection = new Connection(RPC_URL, "confirmed");

  const solBal = await connection.getBalance(recipient);
  console.log(`  SOL balance:  ${(solBal / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  const ata = await getAssociatedTokenAddress(USDC_MINT, recipient, false);
  let usdcBal = "0";
  try {
    const acct = await getAccount(connection, ata, "confirmed", TOKEN_PROGRAM_ID);
    usdcBal = (Number(acct.amount) / 1_000_000).toString();
  } catch {
    /* ATA not yet created — treated as zero */
  }
  console.log(`  USDC balance: ${usdcBal} test-USDC`);
  console.log(`  USDC ATA:     ${ata.toBase58()}\n`);

  if (Number(usdcBal) > 0) {
    console.log(
      "✅ Wallet ready. Open the Orakick app, connect this wallet, and place a prediction."
    );
    return;
  }

  console.log(
    "─────────────────────────────────────────────────────────────────"
  );
  console.log(
    "❌ Wallet has 0 test-USDC. Grab some from Circle's devnet faucet:"
  );
  console.log("");
  console.log("   1. Open https://faucet.circle.com/");
  console.log('   2. Choose "Solana Devnet"');
  console.log(`   3. Paste this address: ${recipient.toBase58()}`);
  console.log(`   4. Request 10 USDC (rate-limited, once every ~1h per IP)`);
  console.log("");
  console.log(`   After the faucet confirms, re-run this script to verify:`);
  console.log(
    `   RECIPIENT=${recipient.toBase58()} npx tsx web/scripts/check-devnet-usdc.ts`
  );
  console.log("");
  console.log("Prefer to run your OWN devnet USDC mint (unlimited)?");
  console.log(
    "  - Deploy an SPL-Token mint with 6 decimals + a keypair you control."
  );
  console.log(
    "  - Update USDC_DEVNET_MINT in web/src/lib/{placeBet,claimWinnings}.ts."
  );
  console.log(
    "  - Update USDC_MINT in contract/programs/contract/src/lib.rs + redeploy."
  );
  console.log(
    "  - Mint to reviewers' ATAs on demand — no faucet dependency."
  );
}

main().catch((err) => {
  console.error("\nFailed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
