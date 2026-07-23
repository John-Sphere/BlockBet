/**
 * Card — glass-morphism container component.
 * All styles are inline so no CSS file is required.
 */
export function Card({ children, className = "", glow = false, onClick, style = {} }) {
  const base = {
    background: "rgba(13,23,40,0.75)",
    border: `1px solid ${glow ? "rgba(46,199,242,0.35)" : "rgba(46,199,242,0.12)"}`,
    borderRadius: 18,
    backdropFilter: "blur(20px)",
    boxShadow: glow
      ? "0 0 40px rgba(46,199,242,0.20), inset 0 1px 0 rgba(255,255,255,0.04)"
      : "0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    cursor: onClick ? "pointer" : "default",
    ...style,
  };

  return (
    <div className={className} style={base} onClick={onClick}>
      {children}
    </div>
  );
}