/**
 * liveEvents.js
 * Real-time chain updates via Arc's WebSocket endpoint, instead of
 * repeatedly polling over HTTP. One persistent connection subscribes
 * to the contract's actual events (BetPlaced, MatchResolved) and
 * pushes updates into matchManager the instant they happen on-chain —
 * for every bet anyone places, not just ones from this browser.
 *
 * Confirmed WSS endpoint from Circle's official developer skill file:
 * wss://rpc.testnet.arc.network
 */

import { ethers } from "ethers";

const WSS_URL = "wss://rpc.testnet.arc.network";
const CONTRACT = import.meta.env.VITE_CONTRACT_ADDRESS;

const EVENT_ABI = [
  "event BetPlaced(uint256 matchId, address bettor, uint8 prediction, uint256 amount)",
  "event MatchResolved(uint256 matchId, uint8 result)",
];

let wsProvider = null;
let contract = null;
let reconnectAttempt = 0;
let reconnectTimer = null;
let handlers = { onBet: null, onResolved: null };

function connect() {
  if (!CONTRACT) return;

  try {
    wsProvider = new ethers.WebSocketProvider(WSS_URL);
    contract = new ethers.Contract(CONTRACT, EVENT_ABI, wsProvider);

    contract.on("BetPlaced", (matchId, bettor, prediction, amount) => {
      handlers.onBet?.(Number(matchId), Number(prediction), ethers.formatUnits(amount, 6));
    });

    contract.on("MatchResolved", (matchId, result) => {
      handlers.onResolved?.(Number(matchId), Number(result));
    });

    // ethers v6 doesn't auto-reconnect a dropped WebSocket — detect
    // the close and reconnect with a short increasing backoff so a
    // brief network blip doesn't permanently lose live updates.
    wsProvider.websocket.addEventListener("close", () => {
      contract = null;
      wsProvider = null;
      reconnectAttempt++;
      const delay = Math.min(30000, 1000 * reconnectAttempt);
      reconnectTimer = setTimeout(connect, delay);
    });

    reconnectAttempt = 0;
  } catch {
    // Couldn't open the socket at all — retry shortly. The existing
    // HTTP-based periodic sync in matchManager.js remains as a
    // fallback the whole time this is retrying.
    reconnectAttempt++;
    const delay = Math.min(30000, 1000 * reconnectAttempt);
    reconnectTimer = setTimeout(connect, delay);
  }
}

// onBet(chainMatchId, selection, amountUsdc) — selection: 1=home, 2=draw, 3=away
// onResolved(chainMatchId, result) — result: 1=home, 2=draw, 3=away
export function startLiveSync({ onBet, onResolved }) {
  handlers = { onBet, onResolved };
  connect();
}

export function stopLiveSync() {
  clearTimeout(reconnectTimer);
  contract?.removeAllListeners();
  wsProvider?.destroy();
  contract = null;
  wsProvider = null;
}
