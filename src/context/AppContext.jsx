import { createContext, useContext, useReducer, useCallback, useEffect } from "react";

const Ctx = createContext(null);

function getInitialTheme() {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("bb_theme");
  if (saved === "light" || saved === "dark") return saved;
  // Fall back to the visitor's OS-level preference the first time.
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const init = { sidebarOpen: false, toasts: [], theme: getInitialTheme() };

function reducer(state, action) {
  switch (action.type) {
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case "ADD_TOAST":
      return { ...state, toasts: [...state.toasts, action.payload] };
    case "REMOVE_TOAST":
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };
    case "TOGGLE_THEME":
      return { ...state, theme: state.theme === "light" ? "dark" : "light" };
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
  const toggleTheme = useCallback(() => dispatch({ type:"TOGGLE_THEME" }), []);

  // Apply the theme to the document and remember it for next visit.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", state.theme);
    window.localStorage.setItem("bb_theme", state.theme);
  }, [state.theme]);

  return (
    <Ctx.Provider value={{ ...state, addToast, toggleSidebar, toggleTheme }}>
      {children}
      {/* Global toast renderer */}
      <div className="toast-container">
        {state.toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
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
