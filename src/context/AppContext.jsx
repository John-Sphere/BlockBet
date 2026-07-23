import { createContext, useContext, useReducer, useCallback } from "react";

const Ctx = createContext(null);

const init = { sidebarOpen: true, toasts: [] };

function reducer(state, action) {
  switch (action.type) {
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case "ADD_TOAST":
      return { ...state, toasts: [...state.toasts, action.payload] };
    case "REMOVE_TOAST":
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, init);

  const addToast = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    dispatch({ type:"ADD_TOAST", payload:{ id, msg, type } });
    setTimeout(() => dispatch({ type:"REMOVE_TOAST", id }), 4500);
  }, []);

  const toggleSidebar = useCallback(() => dispatch({ type:"TOGGLE_SIDEBAR" }), []);

  return (
    <Ctx.Provider value={{ ...state, addToast, toggleSidebar }}>
      {children}
      {/* Global toast renderer */}
      <div className="toast-container">
        {state.toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span>{{ success:"✅", error:"❌", info:"ℹ️", warning:"⚠️" }[t.type]}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}