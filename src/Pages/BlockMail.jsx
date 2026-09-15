import React, { useEffect, useRef, useState } from "react";
import { useBlockMail, MAIL_TOKENS, MAX_FILE_BYTES } from "../hooks/useBlockMail";
import { useWallet } from "../context/WalletContext";
import "./BlockMail.css";

function shortenAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function BlockMail() {
  const { connected, address, shortAddr } = useWallet();
  const {
    initialize, send, getInbox, downloadAttachment,
    ready, registering, sending, approving, uploadingFile, sentHistory,
  } = useBlockMail();

  const [tab, setTab] = useState("inbox");
  const [inbox, setInbox] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [toAddress, setToAddress] = useState("");
  const [body, setBody] = useState("");
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [payment, setPayment] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [sentToast, setSentToast] = useState(null);
  const fileInputRef = useRef(null);

  // A real on-chain query every time the inbox is opened — this is
  // what was missing before: nothing previously ever actually asked
  // the chain for incoming mail.
  async function refreshInbox() {
    setLoadingInbox(true);
    try {
      const entries = await getInbox();
      setInbox(entries);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingInbox(false);
    }
  }

  useEffect(() => {
    if (ready && tab === "inbox") refreshInbox();
  }, [ready, tab]);

  async function handleEnable() {
    setError(null);
    try { await initialize(); } catch (e) { setError(e.message); }
  }

  function handleFileChosen(e) {
    const chosen = e.target.files?.[0];
    if (!chosen) return;
    if (chosen.size > MAX_FILE_BYTES) {
      setError(`File too large — max ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(0)}MB.`);
      e.target.value = "";
      return;
    }
    setError(null);
    setFile(chosen);
    setAttachMenuOpen(false);
  }

  async function handleSend() {
    setError(null);
    try {
      await send(
        toAddress,
        body,
        payment ? { symbol: payment.token, amount: payment.amount } : null,
        file
      );
      setSentToast(
        file ? `Sent message + "${file.name}" (encrypted) ✓`
          : payment ? `Sent ${payment.amount} ${payment.token} + encrypted note ✓`
          : "Message sent and encrypted ✓"
      );
      setComposeOpen(false);
      setToAddress(""); setBody(""); setPayment(null); setFile(null);
      setTab("sent");
      setTimeout(() => setSentToast(null), 3500);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDownload(msg) {
    try {
      const blob = await downloadAttachment(msg.attachment, msg.senderPublicKeyHex);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = msg.attachment.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  }

  const busy = sending || approving || uploadingFile;
  const busyLabel = uploadingFile ? "Encrypting & uploading file…" : approving ? "Approving token spend…" : "Encrypting & sending…";

  if (!connected) {
    return (
      <div className="bm-page">
        <div className="bm-setup">
          <div className="bm-setup-icon">✉</div>
          <h2>Connect a wallet to use BlockMail</h2>
          <p>Every message is encrypted end-to-end — only you and the recipient can ever read it.</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="bm-page">
        <div className="bm-setup">
          <div className="bm-setup-icon">✉</div>
          <h2>Set up BlockMail</h2>
          <p>One signature generates your private encryption key — no gas, no transaction. First-time setup also registers your public key on-chain (that step costs gas, paid in USDC).</p>
          <button className="bm-btn-primary" onClick={handleEnable} disabled={registering}>
            {registering ? "Registering key on-chain…" : "Enable BlockMail"}
          </button>
          {error && <div className="bm-error">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="bm-page">
      <div className="bm-header">
        <div>
          <h1>BlockMail</h1>
          <p>Encrypted wallet-to-wallet messages · {shortAddr}</p>
        </div>
        <button className="bm-btn-primary" onClick={() => setComposeOpen(true)}>Compose</button>
      </div>

      {!composeOpen && (
        <>
          <div className="bm-tabs">
            <button className={`bm-tab ${tab === "inbox" ? "active" : ""}`} onClick={() => setTab("inbox")}>
              Inbox {inbox.length > 0 && <span className="bm-tab-count">{inbox.length}</span>}
            </button>
            <button className={`bm-tab ${tab === "sent" ? "active" : ""}`} onClick={() => setTab("sent")}>
              Sent {sentHistory.length > 0 && <span className="bm-tab-count">{sentHistory.length}</span>}
            </button>
            {tab === "inbox" && (
              <button className="bm-tab bm-refresh-btn" onClick={refreshInbox} disabled={loadingInbox} title="Check the chain for new mail">
                {loadingInbox ? "Checking…" : "↻ Refresh"}
              </button>
            )}
          </div>

          {tab === "inbox" && (
            <div className="bm-list">
              {loadingInbox ? (
                <div className="bm-empty">
                  <div className="bm-empty-icon">✉</div>
                  <h3>Checking the chain…</h3>
                  <p>Querying real MailSent events addressed to your wallet.</p>
                </div>
              ) : inbox.length === 0 ? (
                <div className="bm-empty">
                  <div className="bm-empty-icon">✉</div>
                  <h3>No mail yet</h3>
                  <p>Messages, files, and payments sent to you will show up here.</p>
                </div>
              ) : (
                inbox.map((m) => (
                  <div className="bm-mail-row" key={m.id}>
                    <div className="bm-mail-avatar">{m.from.slice(2, 3).toUpperCase()}</div>
                    <div className="bm-mail-body">
                      <div className="bm-mail-top">
                        <span className="bm-mail-from">From: {shortenAddress(m.from)}</span>
                        <span className="bm-mail-time">{timeAgo(m.timestamp)}</span>
                      </div>
                      <div className="bm-mail-text">{m.text}</div>
                      <div className="bm-tag-row">
                        {m.payment && <span className="bm-payment-tag">💵 Received {m.payment.amount} {m.payment.symbol}</span>}
                        {m.attachment && (
                          <span className="bm-file-tag" style={{ cursor: "pointer" }} onClick={() => handleDownload(m)}>
                            📎 {m.attachment.name} ({formatBytes(m.attachment.size)}) — download
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "sent" && (
            <div className="bm-list">
              {sentHistory.length === 0 ? (
                <div className="bm-empty">
                  <div className="bm-empty-icon">📤</div>
                  <h3>Nothing sent yet</h3>
                  <p>Messages you send will appear here, cached on this device.</p>
                </div>
              ) : (
                sentHistory.map((m) => (
                  <div className="bm-mail-row" key={m.id || m.timestamp}>
                    <div className="bm-mail-avatar sent">→</div>
                    <div className="bm-mail-body">
                      <div className="bm-mail-top">
                        <span className="bm-mail-from">To: {shortenAddress(m.to)}</span>
                        <span className="bm-mail-time">{timeAgo(m.timestamp)}</span>
                      </div>
                      <div className="bm-mail-text">{m.body}</div>
                      <div className="bm-tag-row">
                        {m.payment && <span className="bm-payment-tag">💵 Sent {m.payment.amount} {m.payment.symbol}</span>}
                        {m.fileName && <span className="bm-file-tag">📎 {m.fileName}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {sentToast && <div className="bm-toast">{sentToast}</div>}

      {composeOpen && (
        <div className="bm-compose-panel">
          <div className="bm-compose-head">
            <span>To</span>
            <input className="bm-to-input" type="text" placeholder="0x… wallet address" value={toAddress} onChange={(e) => setToAddress(e.target.value)} />
            <span className="bm-modal-close" onClick={() => setComposeOpen(false)}>✕</span>
          </div>

          <div className="bm-compose-body">
            <div className="bm-encrypt-hint">🔒 Everything you type here is encrypted before it leaves your browser.</div>
          </div>

          {file && (
            <div className="bm-file-chip">
              <span className="bm-chip-icon file">📎</span>
              <div className="bm-file-chip-info">
                <span className="bm-file-chip-name">{file.name}</span>
                <span className="bm-file-chip-size">{formatBytes(file.size)}</span>
              </div>
              <span className="bm-chip-remove" onClick={() => setFile(null)}>✕</span>
            </div>
          )}
          {file && (
            <div className="bm-pay-warning inline">
              🔒 The file is encrypted before upload — only your recipient's key can decrypt it. The encrypted blob's IPFS location is not secret, but its contents are unreadable without the key.
            </div>
          )}

          {payment && (
            <div className="bm-payment-chip">
              <span className="bm-chip-icon">$</span>
              <input className="bm-chip-amount" type="number" placeholder="0.00" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} autoFocus />
              <select className="bm-chip-token" value={payment.token} onChange={(e) => setPayment({ ...payment, token: e.target.value })}>
                {Object.keys(MAIL_TOKENS).map((sym) => <option key={sym} value={sym}>{sym}</option>)}
              </select>
              <span className="bm-chip-remove" onClick={() => setPayment(null)}>✕</span>
            </div>
          )}
          {payment && (
            <div className="bm-pay-warning inline">
              ⚠ Payment amount, token, and both addresses are public on-chain — only the message text is private.
            </div>
          )}

          {error && <div className="bm-error">{error}</div>}

          <div className="bm-composer-bar">
            <div className="bm-attach-wrap">
              <button className="bm-attach-btn" onClick={() => setAttachMenuOpen((o) => !o)} aria-label="Attach">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>
              </button>
              {attachMenuOpen && (
                <div className="bm-attach-menu">
                  <button className="bm-attach-item" onClick={() => { setPayment({ token: "USDC", amount: "" }); setAttachMenuOpen(false); }} disabled={!!payment}>
                    <span className="bm-attach-item-ico">$</span>
                    <span>Attach payment</span>
                  </button>
                  <button className="bm-attach-item" onClick={() => fileInputRef.current?.click()} disabled={!!file}>
                    <span className="bm-attach-item-ico">📎</span>
                    <span>Attach file</span>
                  </button>
                  <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileChosen} />
                </div>
              )}
            </div>

            <input
              className="bm-composer-input"
              type="text"
              placeholder="Write a message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && handleSend()}
            />

            <button className="bm-send-btn" onClick={handleSend} disabled={busy || !toAddress || !body} aria-label="Send" title={busy ? busyLabel : "Send"}>
              {busy ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="bm-spin"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 20l18-8L3 4v6l12 2-12 2v6z" /></svg>
              )}
            </button>
          </div>
          {busy && <div className="bm-busy-label">{busyLabel}</div>}
        </div>
      )}
    </div>
  );
}
