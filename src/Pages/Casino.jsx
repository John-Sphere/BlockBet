import { useMemo, useState } from "react";
import { WHEEL_ORDER, colorOf, BET_TYPES, calculatePayout } from "../engine/rouletteEngine";
import { verifySpin } from "../engine/provablyFair";
import { useBetting } from "../hooks/useBetting";
import { useWallet } from "../context/WalletContext";
import { useApp } from "../context/AppContext";
import "./Casino.css";

const NUMBER_GRID = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

const OUTSIDE_BETS = [
  { key: "low", label: "1–18" },
  { key: "even", label: "EVEN" },
  { key: "red", label: "RED", swatch: "red" },
  { key: "black", label: "BLACK", swatch: "black" },
  { key: "odd", label: "ODD" },
  { key: "high", label: "19–36" },
];

const DOZENS = [
  { key: "dozen1", label: "1st 12", numbers: range(1, 12) },
  { key: "dozen2", label: "2nd 12", numbers: range(13, 24) },
  { key: "dozen3", label: "3rd 12", numbers: range(25, 36) },
];

function range(a, b) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

const OUTSIDE_NUMBERS = {
  low: range(1, 18),
  high: range(19, 36),
  even: range(1, 36).filter((n) => n % 2 === 0),
  odd: range(1, 36).filter((n) => n % 2 === 1),
  red: range(0, 36).filter((n) => colorOf(n) === "red"),
  black: range(0, 36).filter((n) => colorOf(n) === "black"),
};

const CHIP_VALUES = [1, 5, 10, 25, 100];

export default function Casino() {
  const { connected, connect, balance } = useWallet();
  const { playRoulette, placing } = useBetting();
  const { addToast } = useApp();

  const [chipValue, setChipValue] = useState(5);
  const [bets, setBets] = useState([]); // { id, type, label, numbers, stake }
  const [result, setResult] = useState(null); // { number, color }
  const [fairness, setFairness] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [history, setHistory] = useState([]); // real spins only, starts empty

  const totalStake = useMemo(() => bets.reduce((a, b) => a + b.stake, 0), [bets]);
  const totalPotential = useMemo(
    () => bets.reduce((a, b) => a + calculatePayout(b.stake, b.type), 0),
    [bets]
  );

  function addBet(type, label, numbers) {
    setBets((prev) => {
      const existing = prev.find((b) => b.label === label);
      if (existing) {
        return prev.map((b) => (b.label === label ? { ...b, stake: b.stake + chipValue } : b));
      }
      return [...prev, { id: `${label}-${Date.now()}`, type, label, numbers, stake: chipValue }];
    });
  }

  function removeBet(id) {
    setBets((prev) => prev.filter((b) => b.id !== id));
  }

  function clearBets() {
    setBets([]);
  }

  async function handleSpin() {
    if (!connected) { await connect(); return; }
    if (bets.length === 0 || placing) return;
    if (totalStake > Number(balance)) {
      addToast(`Not enough USDC — you have ${Number(balance).toFixed(2)}, need ${totalStake.toFixed(2)}.`, "error");
      return;
    }
    setResult(null);
    setFairness(null);
    setVerifyResult(null);

    try {
      const res = await playRoulette(bets);
      setResult({ number: res.winningNumber, color: colorOf(res.winningNumber) });
      setFairness(res.fairness);
      setHistory((prev) => [res.winningNumber, ...prev].slice(0, 12));
      addToast(
        res.won ? `You won! Number ${res.winningNumber}, total payout ${res.totalPayout} USDC.` : `Number ${res.winningNumber} — not a win this time.`,
        res.won ? "success" : "info"
      );
      setBets([]);
    } catch (e) {
      addToast(e?.message || "Spin failed.", "error");
    }
  }

  async function handleVerify() {
    if (!fairness || !result) return;
    setVerifying(true);
    try {
      const v = await verifySpin({
        serverSeed: fairness.serverSeed,
        serverSeedHash: fairness.serverSeedHash,
        clientSeed: fairness.clientSeed,
        nonce: fairness.nonce,
        claimedNumber: result.number,
      });
      setVerifyResult(v);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="rl-page">
      <div className="rl-header">
        <div>
          <h1>European Roulette</h1>
          <p>Single zero · Provably fair · Settled in USDC on Arc</p>
        </div>
        {history.length > 0 && (
          <div className="rl-history">
            {history.map((n, i) => (
              <span key={i} className={`rl-history-chip rl-c-${colorOf(n)}`}>{n}</span>
            ))}
          </div>
        )}
      </div>

      <div className="rl-layout">
        <div className="rl-main">
          <div className="rl-wheel-panel">
            <Wheel spinning={placing} result={result} />
            <div className="rl-result-block">
              {result ? (
                <>
                  <span className={`rl-result-number rl-c-${result.color}`}>{result.number}</span>
                  <span className="rl-result-label">{result.color.toUpperCase()}</span>
                </>
              ) : (
                <span className="rl-result-placeholder">Place your bets and spin</span>
              )}
            </div>
          </div>

          <div className="rl-table">
            <button
              className={`rl-cell rl-cell-zero rl-c-green ${betSelected(bets, "0") ? "selected" : ""}`}
              onClick={() => addBet("straight", "0", [0])}
            >
              0
            </button>

            <div className="rl-grid">
              {NUMBER_GRID.map((row, ri) => (
                <div className="rl-grid-row" key={ri}>
                  {row.map((n) => (
                    <button
                      key={n}
                      className={`rl-cell rl-c-${colorOf(n)} ${betSelected(bets, String(n)) ? "selected" : ""}`}
                      onClick={() => addBet("straight", String(n), [n])}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="rl-dozens">
              {DOZENS.map((d) => (
                <button
                  key={d.key}
                  className={`rl-cell rl-cell-wide ${betSelected(bets, d.label) ? "selected" : ""}`}
                  onClick={() => addBet("dozen", d.label, d.numbers)}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <div className="rl-outside">
              {OUTSIDE_BETS.map((b) => (
                <button
                  key={b.key}
                  className={`rl-cell rl-cell-wide ${b.swatch ? `rl-c-${b.swatch}` : ""} ${betSelected(bets, b.label) ? "selected" : ""}`}
                  onClick={() => addBet(b.key, b.label, OUTSIDE_NUMBERS[b.key])}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rl-chip-row">
            <span className="rl-chip-label">Chip value</span>
            {CHIP_VALUES.map((v) => (
              <button
                key={v}
                className={`rl-chip ${chipValue === v ? "active" : ""}`}
                onClick={() => setChipValue(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <aside className="rl-slip">
          <div className="rl-slip-head">
            <h2>Your Bets</h2>
            <span className="rl-clear" onClick={clearBets} role="button">Clear all</span>
          </div>

          <div className="rl-slip-items">
            {bets.length === 0 && (
              <div className="rl-slip-empty">Click a number or outside bet to place a chip.</div>
            )}
            {bets.map((b) => (
              <div className="rl-slip-item" key={b.id}>
                <div>
                  <div className="rl-slip-label">{b.label}</div>
                  <div className="rl-slip-sub">{BET_TYPES[b.type]?.label} · pays {BET_TYPES[b.type]?.payout}:1</div>
                </div>
                <div className="rl-slip-right">
                  <span className="rl-slip-stake">{b.stake} USDC</span>
                  <span className="rl-slip-close" onClick={() => removeBet(b.id)} role="button">✕</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rl-slip-summary">
            <div className="rl-sum-row"><span>Total stake</span><span>{totalStake.toFixed(2)} USDC</span></div>
            <div className="rl-sum-row total"><span>Potential payout</span><span className="val">{totalPotential.toFixed(2)} USDC</span></div>
          </div>

          <button className="rl-spin-btn" disabled={bets.length === 0 || placing} onClick={handleSpin}>
            {!connected ? "Connect wallet" : placing ? "Spinning…" : "Spin"}
          </button>

          {fairness && (
            <div className="rl-fairness">
              <div className="rl-fairness-title">Provably fair</div>
              <div className="rl-fairness-row"><span>Server seed hash</span><code>{fairness.serverSeedHash}</code></div>
              <div className="rl-fairness-row"><span>Server seed (revealed)</span><code>{fairness.serverSeed}</code></div>
              <div className="rl-fairness-row"><span>Client seed (your bet's tx hash)</span><code>{fairness.clientSeed}</code></div>
              <button className="rl-clear" style={{ marginBottom: 8 }} onClick={handleVerify} disabled={verifying}>
                {verifying ? "Verifying…" : "Verify this spin →"}
              </button>
              {verifyResult && (
                <div className="rl-fairness-note" style={{ color: verifyResult.valid ? "#33D17A" : "#FF5C5C" }}>
                  {verifyResult.valid
                    ? "✓ Verified — hash(revealed seed) matches, and recomputing from it reproduces this exact winning number."
                    : "✗ Verification failed — something doesn't match."}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function betSelected(bets, label) {
  return bets.some((b) => b.label === label);
}

function Wheel({ spinning, result }) {
  const cx = 110, cy = 110, r = 96;
  const segAngle = 360 / WHEEL_ORDER.length;

  const targetIndex = result ? WHEEL_ORDER.indexOf(result.number) : 0;
  const targetAngle = -(targetIndex * segAngle);
  const spins = spinning ? 0 : 5 * 360;

  return (
    <div className="rl-wheel-wrap">
      <svg
        className={`rl-wheel ${spinning ? "spinning" : ""}`}
        viewBox="0 0 220 220"
        style={!spinning && result ? { transform: `rotate(${spins + targetAngle}deg)` } : undefined}
      >
        {WHEEL_ORDER.map((n, i) => {
          const start = i * segAngle;
          const end = start + segAngle;
          const color = colorOf(n);
          return (
            <path
              key={n}
              d={arcPath(cx, cy, r, start, end)}
              className={`rl-seg rl-c-${color}`}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={r * 0.42} className="rl-wheel-hub" />
      </svg>
      <div className="rl-wheel-pointer" />
    </div>
  );
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const toXY = (deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [x1, y1] = toXY(startDeg);
  const [x2, y2] = toXY(endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`;
}
