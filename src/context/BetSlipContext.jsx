import { createContext, useContext, useState, useCallback } from "react";

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
