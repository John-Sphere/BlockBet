import { useCallback, useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import {
  deriveMailKeypair, encryptMail, decryptMail,
  encryptFileBytes, decryptFileBytes,
  bytesToHex, hexToBytes,
} from "../crypto/blockMailCrypto";
import { useWallet } from "../context/WalletContext";

const BLOCKMAIL_ABI = [
  "function registerPublicKey(bytes calldata publicKey) external",
  "function sendMail(address to, bytes calldata ciphertext, bytes calldata nonce) external",
  "function sendMailWithPayment(address to, bytes calldata ciphertext, bytes calldata nonce, address token, uint256 amount) external",
  "function hasRegisteredKey(address wallet) external view returns (bool)",
  "function encryptionPublicKey(address) external view returns (bytes)",
  "event MailSent(address indexed from, address indexed to, bytes ciphertext, bytes nonce, uint256 timestamp)",
  "event MailPaymentSent(address indexed from, address indexed to, address indexed token, uint256 amount, uint256 timestamp)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

export const MAIL_TOKENS = {
  USDC:   { address: import.meta.env.VITE_USDC_ADDRESS,   decimals: 6, symbol: "USDC" },
  EURC:   { address: import.meta.env.VITE_EURC_ADDRESS,   decimals: 6, symbol: "EURC" },
  cirBTC: { address: import.meta.env.VITE_CIRBTC_ADDRESS, decimals: 8, symbol: "cirBTC" },
};

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // keep in sync with api/ipfs-upload.js

const BLOCKMAIL_ADDRESS = import.meta.env.VITE_BLOCKMAIL_ADDRESS;

function sentStorageKey(address) {
  return `blockmail_sent_${address?.toLowerCase()}`;
}
function loadSentHistory(address) {
  try {
    const raw = localStorage.getItem(sentStorageKey(address));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function appendSentHistory(address, entry) {
  const updated = [entry, ...loadSentHistory(address)].slice(0, 200);
  localStorage.setItem(sentStorageKey(address), JSON.stringify(updated));
  return updated;
}

/** Uploads an already-encrypted blob to IPFS via our serverless proxy. Returns the CID. */
async function uploadEncryptedBlob(bytes) {
  const res = await fetch("/api/ipfs-upload", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: bytes,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "File upload failed");
  }
  const { cid } = await res.json();
  return cid;
}

// Pinata's public gateway — matches the pinning service used in
// api/ipfs-upload.js. (Previously pointed at web3.storage's w3s.link
// gateway, left over from before that upload API was swapped out —
// keeping upload and fetch on the same service avoids any confusion
// about which pinning service is actually serving a given file.)
async function fetchFromIpfs(cid) {
  const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
  if (!res.ok) throw new Error("Could not fetch attachment from IPFS");
  return new Uint8Array(await res.arrayBuffer());
}

export function useBlockMail() {
  const { signer, address, connected } = useWallet();
  const keypairRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sentHistory, setSentHistory] = useState([]);

  useEffect(() => {
    if (address) setSentHistory(loadSentHistory(address));
  }, [address]);

  const contract = signer ? new ethers.Contract(BLOCKMAIL_ADDRESS, BLOCKMAIL_ABI, signer) : null;

  const initialize = useCallback(async () => {
    if (!signer || !connected) throw new Error("Connect a wallet first.");
    const keypair = await deriveMailKeypair((msg) => signer.signMessage(msg));
    keypairRef.current = keypair;

    const alreadyRegistered = await contract.hasRegisteredKey(address);
    if (!alreadyRegistered) {
      setRegistering(true);
      try {
        const tx = await contract.registerPublicKey(bytesToHex(keypair.publicKey));
        await tx.wait();
      } finally {
        setRegistering(false);
      }
    }
    setReady(true);
  }, [signer, connected, address, contract]);

  /**
   * @param {string} toAddress
   * @param {string} plaintext
   * @param {{ symbol: string, amount: string } | null} payment
   * @param {File | null} file - a browser File object from an <input type="file">
   */
  const send = useCallback(async (toAddress, plaintext, payment = null, file = null) => {
    if (!keypairRef.current) throw new Error("Call initialize() first.");
    if (file && file.size > MAX_FILE_BYTES) {
      throw new Error(`File too large — max ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)}MB.`);
    }

    const recipientKeyHex = await contract.encryptionPublicKey(toAddress);
    if (!recipientKeyHex || recipientKeyHex === "0x") {
      throw new Error("This wallet hasn't set up BlockMail yet — they need to open it once to receive messages.");
    }
    const recipientPublicKey = hexToBytes(recipientKeyHex);

    // Build the message payload — plain text, or JSON carrying an attachment pointer.
    let payloadString = plaintext;
    if (file) {
      setUploadingFile(true);
      try {
        const fileBytes = new Uint8Array(await file.arrayBuffer());
        const { ciphertext: fileCiphertext, nonce: fileNonce } = encryptFileBytes(
          fileBytes, recipientPublicKey, keypairRef.current.secretKey
        );
        const cid = await uploadEncryptedBlob(fileCiphertext);

        payloadString = JSON.stringify({
          v: 1,
          text: plaintext,
          attachment: {
            cid,
            nonce: bytesToHex(fileNonce),
            name: file.name,
            mime: file.type || "application/octet-stream",
            size: file.size,
          },
        });
      } finally {
        setUploadingFile(false);
      }
    }

    const { ciphertext, nonce } = encryptMail(payloadString, recipientPublicKey, keypairRef.current.secretKey);
    const ciphertextHex = bytesToHex(ciphertext);
    const nonceHex = bytesToHex(nonce);

    let txHash;
    if (!payment) {
      setSending(true);
      try {
        const tx = await contract.sendMail(toAddress, ciphertextHex, nonceHex);
        txHash = (await tx.wait()).hash;
      } finally {
        setSending(false);
      }
    } else {
      const token = MAIL_TOKENS[payment.symbol];
      if (!token) throw new Error(`Unsupported token: ${payment.symbol}`);
      const amountRaw = ethers.parseUnits(payment.amount, token.decimals);
      const erc20 = new ethers.Contract(token.address, ERC20_ABI, signer);
      const currentAllowance = await erc20.allowance(address, BLOCKMAIL_ADDRESS);
      if (currentAllowance < amountRaw) {
        setApproving(true);
        try {
          const approveTx = await erc20.approve(BLOCKMAIL_ADDRESS, amountRaw);
          await approveTx.wait();
        } finally {
          setApproving(false);
        }
      }
      setSending(true);
      try {
        const tx = await contract.sendMailWithPayment(toAddress, ciphertextHex, nonceHex, token.address, amountRaw);
        txHash = (await tx.wait()).hash;
      } finally {
        setSending(false);
      }
    }

    const entry = {
      id: txHash,
      to: toAddress,
      body: plaintext,
      fileName: file?.name || null,
      payment: payment ? { symbol: payment.symbol, amount: payment.amount } : null,
      timestamp: Date.now(),
    };
    setSentHistory(appendSentHistory(address, entry));
  }, [contract, signer, address]);

  const decrypt = useCallback((ciphertextHex, nonceHex, senderPublicKeyHex) => {
    if (!keypairRef.current) return null;
    const raw = decryptMail(hexToBytes(ciphertextHex), hexToBytes(nonceHex), hexToBytes(senderPublicKeyHex), keypairRef.current.secretKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === 1) return parsed; // { text, attachment }
    } catch {
      // not JSON — plain text message, no attachment
    }
    return { text: raw, attachment: null };
  }, []);

  // Queries every real MailSent event addressed to you, decrypts
  // each one, and correlates any matching MailPaymentSent event from
  // the same transaction — since sendMailWithPayment emits both
  // events together in one call, sharing the same transaction hash.
  // This is a genuine on-chain query every time, not cached data.
  //
  // Deliberately queries only a recent block range, not from block
  // 0 — Arc's public RPC node prunes old chain history, so scanning
  // the entire chain from genesis fails with a real "pruned history
  // unavailable" error. 100,000 blocks comfortably covers this
  // contract's entire lifetime for now; if message volume grows
  // over a long period, this window may eventually need widening.
  const getInbox = useCallback(async () => {
    if (!contract || !address || !keypairRef.current) {
      console.log("[BlockMail debug] getInbox skipped — missing:", { hasContract: !!contract, address, hasKeypair: !!keypairRef.current });
      return [];
    }

    const readProvider = signer?.provider || new ethers.JsonRpcProvider("https://rpc.testnet.arc.io");
    const currentBlock = await readProvider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 100000);
    console.log("[BlockMail debug] querying as address:", address, "fromBlock:", fromBlock, "currentBlock:", currentBlock);

    const [mailEvents, paymentEvents] = await Promise.all([
      contract.queryFilter(contract.filters.MailSent(null, address), fromBlock, "latest"),
      contract.queryFilter(contract.filters.MailPaymentSent(null, address), fromBlock, "latest"),
    ]);
    console.log("[BlockMail debug] mailEvents found:", mailEvents.length, mailEvents);
    console.log("[BlockMail debug] paymentEvents found:", paymentEvents.length);

    const paymentByTxHash = new Map();
    for (const p of paymentEvents) {
      paymentByTxHash.set(p.transactionHash, {
        token: p.args.token,
        amount: p.args.amount,
      });
    }

    // Cache sender public keys within this single call — a sender
    // who's messaged you multiple times only needs one lookup.
    const senderKeyCache = new Map();
    async function getSenderKey(senderAddress) {
      if (!senderKeyCache.has(senderAddress)) {
        const key = await contract.encryptionPublicKey(senderAddress);
        senderKeyCache.set(senderAddress, key);
      }
      return senderKeyCache.get(senderAddress);
    }

    const entries = await Promise.all(
      mailEvents.map(async (event) => {
        const senderPublicKeyHex = await getSenderKey(event.args.from);
        const decrypted = decrypt(event.args.ciphertext, event.args.nonce, senderPublicKeyHex);
        console.log("[BlockMail debug] event from:", event.args.from, "senderKey:", senderPublicKeyHex, "decrypted:", decrypted);
        const payment = paymentByTxHash.get(event.transactionHash);

        let paymentInfo = null;
        if (payment) {
          const symbol = Object.keys(MAIL_TOKENS).find(
            (s) => MAIL_TOKENS[s].address?.toLowerCase() === payment.token.toLowerCase()
          );
          if (symbol) {
            paymentInfo = { symbol, amount: ethers.formatUnits(payment.amount, MAIL_TOKENS[symbol].decimals) };
          }
        }

        return {
          id: event.transactionHash,
          from: event.args.from,
          senderPublicKeyHex,
          text: decrypted?.text ?? "[Could not decrypt this message]",
          attachment: decrypted?.attachment ?? null,
          payment: paymentInfo,
          timestamp: Number(event.args.timestamp) * 1000,
        };
      })
    );
    console.log("[BlockMail debug] final entries returned:", entries);

    // Most recent first, same convention as sentHistory.
    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }, [contract, address, decrypt]);

  /** Downloads + decrypts a file attachment referenced in an already-decrypted message. */
  const downloadAttachment = useCallback(async (attachment, senderPublicKeyHex) => {
    if (!keypairRef.current) throw new Error("Not initialized.");
    const ciphertext = await fetchFromIpfs(attachment.cid);
    const decrypted = decryptFileBytes(
      ciphertext, hexToBytes(attachment.nonce), hexToBytes(senderPublicKeyHex), keypairRef.current.secretKey
    );
    if (!decrypted) throw new Error("Failed to decrypt attachment — wrong key or corrupted data.");
    return new Blob([decrypted], { type: attachment.mime });
  }, []);

  return {
    initialize, send, decrypt, getInbox, downloadAttachment,
    ready, registering, sending, approving, uploadingFile, sentHistory,
  };
}
