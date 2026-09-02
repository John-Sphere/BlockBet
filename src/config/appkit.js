import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

// Arc Testnet isn't in viem's built-in chain list in every version, so
// it's defined explicitly here to guarantee correctness — matches the
// values confirmed from Arc's own docs and MetaMask's live RPC query
// earlier (chain ID 5042002, USDC as native gas at 18 decimals).
export const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.io"] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
};

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

const metadata = {
  name: "BLOCKBET",
  description: "AI-powered on-chain sports betting on Arc",
  url: "https://www.blockbetfi.xyz",
  icons: ["https://www.blockbetfi.xyz/logo.png"],
};

export const wagmiAdapter = new WagmiAdapter({
  networks: [arcTestnet],
  projectId,
  ssr: false,
});

// This is what actually renders the connection modal — shows every
// detected browser extension wallet AND a WalletConnect QR code
// option, in one unified UI (replacing our old custom picker modal).
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [arcTestnet],
  projectId,
  metadata,
  features: { analytics: false },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
