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

// Same indexer already used for match/bet/swap data — real, fast
// GraphQL queries instead of scanning blockchain history directly.
// This is what actually resolved the earlier RPC issues (pruned
// history unavailable, then requested range too large) — the
// indexer processes blocks incrementally as they happen, rather
// than needing wide ad-hoc queries against a public RPC node.
const INDEXER_URL = "https://indexer.dev.hyperindex.xyz/87c02a0/v1/graphql";

async function queryIndexer(query, variables) {
  const res = await fetch(INDEXER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "Indexer query failed");
  return json.data;
}

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

  // Real query against the indexer — genuinely simpler than the RPC
  // approach this replaced, since the indexer already correlates any
  // attached payment directly into each message (paymentToken/
  // paymentAmount), and sender public keys can be looked up the same
  // way instead of a separate contract call.
  const getInbox = useCallback(async () => {
    if (!address || !keypairRef.current) return [];

    const data = await queryIndexer(
      `query Inbox($to: String!) {
        MailMessage(where: { to: { _ilike: $to } }, order_by: { timestamp: desc }) {
          id from to ciphertext nonce timestamp paymentToken paymentAmount
        }
      }`,
      { to: address }
    );
    const messages = data.MailMessage;
    if (messages.length === 0) return [];

    // Batch-fetch every unique sender's public key in one query,
    // rather than one lookup per message.
    const uniqueSenders = [...new Set(messages.map((m) => m.from))];
    const keyData = await queryIndexer(
      `query SenderKeys($senders: [String!]) {
        PublicKeyRegistration(where: { id: { _in: $senders } }) {
          id publicKey
        }
      }`,
      { senders: uniqueSenders }
    );
    const keysByAddress = new Map(keyData.PublicKeyRegistration.map((r) => [r.id.toLowerCase(), r.publicKey]));

    return messages.map((m) => {
      const senderPublicKeyHex = keysByAddress.get(m.from.toLowerCase());
      const decrypted = senderPublicKeyHex ? decrypt(m.ciphertext, m.nonce, senderPublicKeyHex) : null;

      let paymentInfo = null;
      if (m.paymentToken) {
        const symbol = Object.keys(MAIL_TOKENS).find(
          (s) => MAIL_TOKENS[s].address?.toLowerCase() === m.paymentToken.toLowerCase()
        );
        if (symbol) {
          paymentInfo = { symbol, amount: ethers.formatUnits(m.paymentAmount, MAIL_TOKENS[symbol].decimals) };
        }
      }

      return {
        id: m.id,
        from: m.from,
        senderPublicKeyHex,
        text: decrypted?.text ?? "[Could not decrypt this message]",
        attachment: decrypted?.attachment ?? null,
        payment: paymentInfo,
        timestamp: Number(m.timestamp) * 1000,
      };
    });
  }, [address, decrypt]);

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
