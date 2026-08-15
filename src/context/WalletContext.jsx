import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";

const Ctx = createContext(null);

// Arc Testnet's chain ID as of when this was written — confirmed
// directly from MetaMask querying the live RPC endpoint. This differs
// from 1214 (0x4BE), which is what Arc's testnet used previously —
// it appears to have been migrated/reset at some point. If wallet
// connection issues resurface later, check whether this has changed
// again by adding the network manually in MetaMask and reading
// whatever chain ID it reports back.
const ARC_CHAIN = {
  chainId: "0x4CEF52",
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: ["https://rpc.testnet.arc.network"],
  blockExplorerUrls: ["https://testnet.arcscan.app"],
};

const USDC_ADDR = "0x3600000000000000000000000000000000000000";
const USDC_ABI  = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];

export function WalletProvider({ children }) {
  const [provider,   setProvider]   = useState(null);
  const [signer,     setSigner]     = useState(null);
  const [address,    setAddress]    = useState("");
  const [shortAddr,  setShortAddr]  = useState("");
  const [balance,    setBalance]    = useState("0.00");
  const [connected,  setConnected]  = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [wrongNet,   setWrongNet]   = useState(false);
  const [txPending,  setTxPending]  = useState(false);

  const isArc = (cid) => parseInt(cid, 16) === 5042002;

  const loadBalance = useCallback(async (addr, prov) => {
    try {
      const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, prov);
      const raw  = await usdc.balanceOf(addr);
      setBalance(Number(ethers.formatUnits(raw, 6)).toFixed(2));
    } catch { setBalance("0.00"); }
  }, []);

  const ensureArcNetwork = useCallback(async () => {
    if (!window.ethereum) return false;
    try {
      await window.ethereum.request({
        method:"wallet_switchEthereumChain",
        params:[{ chainId: ARC_CHAIN.chainId }],
      });
      setWrongNet(false); return true;
    } catch (e) {
      if (e.code === 4902) {
        try {
          await window.ethereum.request({ method:"wallet_addEthereumChain", params:[ARC_CHAIN] });
          setWrongNet(false); return true;
        } catch { return false; }
      }
      return false;
    }
  }, []);

  const handleAccountsChanged = useCallback(async (accs) => {
    if (!accs.length) { disconnect(); return; }
    const prov = new ethers.BrowserProvider(window.ethereum);
    const s    = await prov.getSigner();
    setProvider(prov); setSigner(s);
    setAddress(accs[0]);
    setShortAddr(accs[0].slice(0,6) + "…" + accs[0].slice(-4));
    await loadBalance(accs[0], prov);
  }, [loadBalance]);

  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", () => window.location.reload());
    if (localStorage.getItem("bb_wallet")) silentReconnect();
    return () => {
      if (!window.ethereum) return;
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [handleAccountsChanged]);

  async function silentReconnect() {
    try {
      const accs = await window.ethereum.request({ method:"eth_accounts" });
      if (!accs.length) return;
      const prov = new ethers.BrowserProvider(window.ethereum);
      const net  = await prov.getNetwork();
      setWrongNet(!isArc("0x" + net.chainId.toString(16)));
      const s    = await prov.getSigner();
      setProvider(prov); setSigner(s); setConnected(true);
      setAddress(accs[0]);
      setShortAddr(accs[0].slice(0,6) + "…" + accs[0].slice(-4));
      await loadBalance(accs[0], prov);
    } catch {}
  }

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      window.open("https://metamask.io/download/", "_blank");
      return { error:"MetaMask not found. Please install it." };
    }
    setConnecting(true);
    try {
      const prov = new ethers.BrowserProvider(window.ethereum);
      await prov.send("eth_requestAccounts", []);
      const net  = await prov.getNetwork();
      const cid  = "0x" + net.chainId.toString(16);
      if (!isArc(cid)) { await ensureArcNetwork(); }
      else setWrongNet(false);
      const s   = await prov.getSigner();
      const a   = await s.getAddress();
      setProvider(prov); setSigner(s); setConnected(true);
      setAddress(a);
      setShortAddr(a.slice(0,6) + "…" + a.slice(-4));
      localStorage.setItem("bb_wallet", "1");
      await loadBalance(a, prov);
      return { success:true };
    } catch (e) {
      if (e.code === 4001) return { error:"Connection rejected." };
      return { error:"Failed to connect wallet." };
    } finally { setConnecting(false); }
  }, [ensureArcNetwork, loadBalance]);

  function disconnect() {
    setProvider(null); setSigner(null); setAddress(""); setShortAddr("");
    setBalance("0.00"); setConnected(false); setWrongNet(false);
    localStorage.removeItem("bb_wallet");
  }

  const approveUsdc = useCallback(async (spender, amount) => {
    if (!signer) throw new Error("Wallet not connected");
    const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, signer);
    setTxPending(true);
    try {
      const tx = await usdc.approve(spender, ethers.parseUnits(String(amount), 6));
      await tx.wait(); return tx;
    } finally { setTxPending(false); }
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
