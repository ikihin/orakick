"use client";

import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

export default function WalletButton() {
  return <WalletMultiButton className="!bg-forest !rounded-full !h-10 !text-sm" />;
}
