import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useDisconnect, useWalletClient, useSwitchChain } from "wagmi";
import { arcTestnet } from "../config/appkit";

const Ctx = createContext(null);

const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const USDC_ABI  = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

// Converts a wagmi/viem WalletClient into a real ethers.js Signer —
// this is the bridge that lets every existing file (useBetting.js,
// etc.) keep using plain ethers.Contract calls exactly as before,
// completely unaware that the connection itself now goes through
// wagmi/AppKit under the hood.
function walletClientToSigner(walletClient) {
  const { account, chain, transport } = walletClient;
  const network = { chainId: chain.id, name: chain.name };
  const provider = new ethers.BrowserProvider(transport, network);
  return new ethers.JsonRpcSigner(provider, account.address);
}

export function WalletProvider({ children }) {
  const { open } = useAppKit();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [balance, setBalance] = useState("0.00");
  const [connecting, setConnecting] = useState(false);
  const [txPending, setTxPending] = useState(false);

  const shortAddr = address ? address.slice(0,6) + "…" + address.slice(-4) : "";
  const connected = isConnected && !!address;
  const wrongNet = connected && chainId !== arcTestnet.id;

  const loadBalance = useCallback(async (addr, prov) => {
    try {
      const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, prov);
      const raw  = await usdc.balanceOf(addr);
      setBalance(Number(ethers.formatUnits(raw, 6)).toFixed(2));
    } catch { setBalance("0.00"); }
  }, []);

  // Whenever wagmi's wallet client changes (connect, account switch,
  // network switch), rebuild the ethers signer/provider that the rest
  // of the app actually uses.
  useEffect(() => {
    if (!walletClient || !address) {
      setSigner(null);
      setProvider(null);
      return;
    }
    const s = walletClientToSigner(walletClient);
    setSigner(s);
    setProvider(s.provider);
    loadBalance(address, s.provider);
  }, [walletClient, address, loadBalance]);

  // Opens AppKit's connection modal — shows every detected browser
  // extension wallet plus a WalletConnect QR option, all in one UI.
  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      await open();
      return { success: true };
    } catch (e) {
      return { error: "Failed to open wallet connection." };
    } finally {
      setConnecting(false);
    }
  }, [open]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    setSigner(null);
    setProvider(null);
    setBalance("0.00");
  }, [wagmiDisconnect]);

  const ensureArcNetwork = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: arcTestnet.id });
      return true;
    } catch {
      return false;
    }
  }, [switchChainAsync]);

  const approveUsdc = useCallback(async (spender, amount) => {
    if (!signer) throw new Error("Wallet not connected");
    const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, signer);
    setTxPending(true);
    try {
      const tx = await usdc.approve(spender, ethers.parseUnits(String(amount), 6));
      await tx.wait();
      return tx;
    } finally {
      setTxPending(false);
    }
  }, [signer]);

  const refreshBalance = useCallback(async () => {
    if (!address || !provider) return;
    await loadBalance(address, provider);
  }, [address, provider, loadBalance]);

  return (
    <Ctx.Provider value={{
      provider, signer, address, shortAddr, balance,
      connected, connecting, wrongNet, txPending,
      connect, disconnect, ensureArcNetwork,
      approveUsdc, refreshBalance,
      usdcAddress: USDC_ADDR,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
