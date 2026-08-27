import { useState } from "react";
import { colorOf } from "../engine/rouletteEngine";
import { verifySpin } from "../engine/provablyFair";
import { useBetting } from "../hooks/useBetting";
import { useWallet } from "../context/WalletContext";
import { useApp } from "../context/AppContext";
import "./Casino.css";

const NUMBERS = Array.from({ length: 37 }, (_, i) => i); // 0-36

const OUTSIDE_BETS = [
  { id: "red",   label: "Red",    numbers: NUMBERS.filter((n) => colorOf(n) === "red") },
  { id: "black", label: "Black",  numbers: NUMBERS.filter((n) => colorOf(n) === "black") },
  { id: "odd",   label: "Odd",    numbers: NUMBERS.filter((n) => n !== 0 && n % 2 === 1) },
  { id: "even",  label: "Even",   numbers: NUMBERS.filter((n) => n !== 0 && n % 2 === 0) },
  { id: "low",   label: "1-18",   numbers: NUMBERS.filter((n) => n >= 1 && n <= 18) },
  { id: "high",  label: "19-36",  numbers: NUMBERS.filter((n) => n >= 19 && n <= 36) },
  { id: "d1",    label: "1st 12", numbers: NUMBERS.filter((n) => n >= 1 && n <= 12) },
  { id: "d2",    label: "2nd 12", numbers: NUMBERS.filter((n) => n >= 13 && n <= 24) },
  { id: "d3",    label: "3rd 12", numbers: NUMBERS.filter((n) => n >= 25 && n <= 36) },
];

export default function Casino() {
  const { connected, connect, balance } = useWallet();
  const { playRoulette, placing } = useBetting();
  const { addToast } = useApp();

  const [selectedBet, setSelectedBet] = useState(null); // { numbers: [...] }
  const [stake, setStake] = useState("10");
  const [result, setResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  function selectStraight(n) {
    setSelectedBet({ label: `Straight up: ${n}`, numbers: [n] });
    setResult(null);
    setVerifyResult(null);
  }

  function selectOutside(bet) {
    setSelectedBet({ label: bet.label, numbers: bet.numbers });
    setResult(null);
    setVerifyResult(null);
  }

  async function handleSpin() {
    if (!connected) { await connect(); return; }
    if (!selectedBet) { addToast("Pick a number or a bet first.", "error"); return; }
    if (!stake || Number(stake) <= 0) { addToast("Enter a stake amount.", "error"); return; }
    if (Number(stake) > Number(balance)) {
      addToast(`Not enough USDC — you have ${Number(balance).toFixed(2)}, need ${Number(stake).toFixed(2)}.`, "error");
      return;
    }
    try {
      const res = await playRoulette({ amount: stake, numbers: selectedBet.numbers });
      setResult(res);
      addToast(res.won ? `You won! Number ${res.winningNumber}, payout ${res.payout} USDC.` : `Number ${res.winningNumber} — not a win this time.`, res.won ? "success" : "info");
    } catch (e) {
      addToast(e?.message || "Spin failed.", "error");
    }
  }

  async function handleVerify() {
    if (!result?.fairness) return;
    setVerifying(true);
    try {
      const v = await verifySpin({
        serverSeed: result.fairness.serverSeed,
        serverSeedHash: result.fairness.serverSeedHash,
        clientSeed: result.fairness.clientSeed,
        nonce: result.fairness.nonce,
        claimedNumber: result.winningNumber,
      });
      setVerifyResult(v);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="casino-page">
      <div className="casino-header">
        <h1>Roulette</h1>
        <p>European roulette — single zero. Every spin is provably fair, verifiable by you after the fact.</p>
      </div>

      <div className="casino-table">
        <button
          className={`casino-cell casino-zero ${selectedBet?.numbers?.length === 1 && selectedBet.numbers[0] === 0 ? "selected" : ""}`}
          onClick={() => selectStraight(0)}
        >
          0
        </button>
        <div className="casino-grid">
          {NUMBERS.slice(1).map((n) => (
            <button
              key={n}
              className={`casino-cell casino-${colorOf(n)} ${selectedBet?.numbers?.length === 1 && selectedBet.numbers[0] === n ? "selected" : ""}`}
              onClick={() => selectStraight(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="casino-outside">
        {OUTSIDE_BETS.map((bet) => (
          <button
            key={bet.id}
            className={`casino-outside-btn ${selectedBet?.label === bet.label ? "selected" : ""}`}
            onClick={() => selectOutside(bet)}
          >
            {bet.label}
          </button>
        ))}
      </div>

      <div className="casino-controls">
        <div className="casino-selected">
          {selectedBet ? `Selected: ${selectedBet.label} (pays ${(36 / selectedBet.numbers.length).toFixed(0)}x)` : "Pick a number or bet type above"}
        </div>
        <div className="casino-stake">
          <span>USDC</span>
          <input type="number" min="1" value={stake} onChange={(e) => setStake(e.target.value)} />
        </div>
        <button className="casino-spin-btn" onClick={handleSpin} disabled={placing}>
          {!connected ? "Connect wallet" : placing ? "Spinning…" : "Spin"}
        </button>
      </div>

      {result && (
        <div className={`casino-result ${result.won ? "won" : "lost"}`}>
          <div className="casino-result-number">{result.winningNumber}</div>
          <div className="casino-result-text">
            {result.won ? `You won ${result.payout} USDC!` : "No win this spin."}
          </div>
          <button className="casino-verify-btn" onClick={handleVerify} disabled={verifying}>
            {verifying ? "Verifying…" : "Verify this spin was fair"}
          </button>
          {verifyResult && (
            <div className={`casino-verify-result ${verifyResult.valid ? "valid" : "invalid"}`}>
              {verifyResult.valid
                ? "✓ Verified — the server's commitment matches, and the result is genuinely reproducible from the revealed seed."
                : "✗ Verification failed — something doesn't match."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
