/**
 * Badge — small status/label chip.
 * Colors: primary | success | warning | danger | purple | ghost
 * Sizes:  sm | md | lg
 */
export function Badge({ children, color = "primary", size = "sm", style = {} }) {
  const colors = {
    primary: { bg:"rgba(46,199,242,0.12)",  border:"rgba(46,199,242,0.30)",  text:"#2EC7F2" },
    success: { bg:"rgba(16,233,129,0.12)",  border:"rgba(16,233,129,0.30)",  text:"#10E981" },
    warning: { bg:"rgba(255,200,87,0.12)",  border:"rgba(255,200,87,0.30)",  text:"#FFC857" },
    danger:  { bg:"rgba(255,77,109,0.12)",  border:"rgba(255,77,109,0.30)",  text:"#FF4D6D" },
    purple:  { bg:"rgba(139,92,246,0.12)",  border:"rgba(139,92,246,0.30)",  text:"#8B5CF6" },
    ghost:   { bg:"rgba(255,255,255,0.06)", border:"rgba(255,255,255,0.12)", text:"#C8D2DC" },
  };

  const sizes = {
    sm: { fontSize:9,  padding:"3px 8px",  borderRadius:6 },
    md: { fontSize:11, padding:"5px 10px", borderRadius:8 },
    lg: { fontSize:13, padding:"6px 14px", borderRadius:10 },
  };

  const c = colors[color] || colors.primary;
  const s = sizes[size]   || sizes.sm;

  return (
    <span style={{
      display:"inline-flex", alignItems:"center",
      background:c.bg, border:`1px solid ${c.border}`, color:c.text,
      fontWeight:700, letterSpacing:"0.5px",
      ...s, ...style,
    }}>
      {children}
    </span>
  );
}