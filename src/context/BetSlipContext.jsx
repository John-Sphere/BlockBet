import { createContext, useContext, useState, useCallback } from "react";
import { ensureMatchOnChain } from "../engine/matchManager";

const Ctx = createContext(null);

export function BetSlipProvider({ children }) {
  const [selections, setSelections] = useState([]);
  const [open, setOpen] = useState(false);

  const addSelection = useCallback((match, side, odds) => {
    setSelections((prev) => {
      const exists = prev.find((s) => s.matchId === match.id);
      const next = exists
        ? prev.filter((s) => s.matchId !== match.id)
        : prev;
      if (exists && exists.side === side) {
        // Clicking the same pick again removes it
        return next;
      }
      return [
        ...next,
        {
          matchId: match.id,
          chainMatchId: match.chainMatchId,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          side,
          odds,
        },
      ];
    });
    setOpen(true);

    // Only reach out to the chain for THIS specific match, right when
    // someone actually picks it — not for all 50+ matches on page load.
    if (match.chainMatchId === null || match.chainMatchId === undefined) {
      ensureMatchOnChain(match.id, match.homeTeam, match.awayTeam).then((chainMatchId) => {
        if (chainMatchId === null) return;
        setSelections((prev) =>
          prev.map((s) => (s.matchId === match.id ? { ...s, chainMatchId } : s))
        );
      });
    }
  }, []);

  const removeSelection = useCallback((matchId) => {
    setSelections((prev) => prev.filter((s) => s.matchId !== matchId));
  }, []);

  const clearAll = useCallback(() => setSelections([]), []);

  return (
    <Ctx.Provider
      value={{ selections, addSelection, removeSelection, clearAll, open, setOpen }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useBetSlip() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBetSlip must be used inside BetSlipProvider");
  return ctx;
}
