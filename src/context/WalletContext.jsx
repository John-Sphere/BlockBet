import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { ethers } from "ethers";

const Ctx = createContext(null);

// Per Arc's official docs: Arc genuinely uses USDC as its native gas
// token, represented at 18 decimals (not the 6 decimals the separate
// USDC ERC-20 contract below uses for actual bet amounts — those are
// two different things: this is what pays gas, USDC_ADDR below is
// the token used inside the app for betting).
const ARC_CHAIN = {
  chainId: "0x4CEF52",
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: ["https://rpc.testnet.arc.io"],
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

  // ── EIP-6963: detect every wallet extension installed, not just
  // assume window.ethereum is MetaMask ──────────────────────────
  const [availableWallets, setAvailableWallets] = useState([]);
  const activeRawProvider = useRef(null); // the actual EIP-1193 object in use
  const listenersAttached = useRef(null); // which raw provider currently has listeners

  useEffect(() => {
    function onAnnounce(event) {
      setAvailableWallets((prev) => {
        if (prev.some((w) => w.info.uuid === event.detail.info.uuid)) return prev;
        return [...prev, event.detail];
      });
    }
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, []);

  const isArc = (cid) => parseInt(cid, 16) === 5042002;

  const loadBalance = useCallback(async (addr, prov) => {
    try {
      const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, prov);
      const raw  = await usdc.balanceOf(addr);
      setBalance(Number(ethers.formatUnits(raw, 6)).toFixed(2));
    } catch { setBalance("0.00"); }
  }, []);

  const ensureArcNetwork = useCallback(async () => {
    const raw = activeRawProvider.current;
    if (!raw) return false;
    try {
      await raw.request({
        method:"wallet_switchEthereumChain",
        params:[{ chainId: ARC_CHAIN.chainId }],
      });
      setWrongNet(false); return true;
    } catch (e) {
      if (e.code === 4902) {
        try {
          await raw.request({ method:"wallet_addEthereumChain", params:[ARC_CHAIN] });
          setWrongNet(false); return true;
        } catch { return false; }
      }
      return false;
    }
  }, []);

  const handleAccountsChanged = useCallback(async (accs) => {
    const raw = activeRawProvider.current;
    if (!accs.length || !raw) { disconnect(); return; }
    const prov = new ethers.BrowserProvider(raw);
    const s    = await prov.getSigner();
    setProvider(prov); setSigner(s);
    setAddress(accs[0]);
    setShortAddr(accs[0].slice(0,6) + "…" + accs[0].slice(-4));
    await loadBalance(accs[0], prov);
  }, [loadBalance]);

  // Attaches accountsChanged/chainChanged listeners to whichever raw
  // provider is currently active, detaching from any previous one so
  // switching wallets doesn't leave stale listeners behind.
  function attachListeners(raw) {
    if (listenersAttached.current === raw) return;
    if (listenersAttached.current) {
      listenersAttached.current.removeListener?.("accountsChanged", handleAccountsChanged);
    }
    raw.on?.("accountsChanged", handleAccountsChanged);
    raw.on?.("chainChanged", () => window.location.reload());
    listenersAttached.current = raw;
  }

  useEffect(() => {
    const savedWalletId = localStorage.getItem("bb_wallet_id");
    if (savedWalletId) silentReconnect(savedWalletId);
    // Re-run once wallets have had a chance to announce themselves.
  }, [availableWallets.length]);

  function findRawProvider(walletId) {
    if (walletId === "legacy") return window.ethereum || null;
    const match = availableWallets.find((w) => w.info.uuid === walletId);
    return match ? match.provider : null;
  }

  async function silentReconnect(walletId) {
    const raw = findRawProvider(walletId);
    if (!raw) return;
    try {
      const accs = await raw.request({ method:"eth_accounts" });
      if (!accs.length) return;
      attachListeners(raw);
      activeRawProvider.current = raw;
      const prov = new ethers.BrowserProvider(raw);
      const net  = await prov.getNetwork();
      setWrongNet(!isArc("0x" + net.chainId.toString(16)));
      const s    = await prov.getSigner();
      setProvider(prov); setSigner(s); setConnected(true);
      setAddress(accs[0]);
      setShortAddr(accs[0].slice(0,6) + "…" + accs[0].slice(-4));
      await loadBalance(accs[0], prov);
    } catch {}
  }

  // walletId: the uuid of a detected EIP-6963 wallet, or omitted to
  // fall back to window.ethereum (legacy single-wallet behavior) —
  // used when only one wallet is installed, so there's nothing to
  // pick between.
  const connect = useCallback(async (walletId) => {
    const raw = walletId ? findRawProvider(walletId) : (window.ethereum || null);
    if (!raw) {
      window.open("https://metamask.io/download/", "_blank");
      return { error:"No wallet found. Please install one." };
    }
    setConnecting(true);
    try {
      attachListeners(raw);
      activeRawProvider.current = raw;
      const prov = new ethers.BrowserProvider(raw);
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
      localStorage.setItem("bb_wallet_id", walletId || "legacy");
      await loadBalance(a, prov);
      return { success:true };
    } catch (e) {
      if (e.code === 4001) return { error:"Connection rejected." };
      return { error:"Failed to connect wallet." };
    } finally { setConnecting(false); }
  }, [ensureArcNetwork, loadBalance, availableWallets]);

  function disconnect() {
    setProvider(null); setSigner(null); setAddress(""); setShortAddr("");
    setBalance("0.00"); setConnected(false); setWrongNet(false);
    activeRawProvider.current = null;
    localStorage.removeItem("bb_wallet");
    localStorage.removeItem("bb_wallet_id");
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
      availableWallets, // list of { info: {uuid,name,icon,rdns}, provider } for the picker UI
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
