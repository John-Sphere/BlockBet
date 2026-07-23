/**
 * Button — primary UI button component.
 * Variants: primary | outline | ghost | danger
 * Sizes:    sm | md | lg
 */
export function Button({
  children, onClick, variant = "primary", size = "md",
  loading = false, disabled = false, fullWidth = false, style = {},
}) {
  const sizes = {
    sm: { padding:"7px 14px", fontSize:12, borderRadius:8 },
    md: { padding:"11px 22px", fontSize:14, borderRadius:12 },
    lg: { padding:"15px 30px", fontSize:16, borderRadius:16 },
  };

  const variants = {
    primary: {
      background:"linear-gradient(135deg,#2EC7F2,#47D7FF)",
      color:"#050608", border:"none",
      boxShadow:"0 0 30px rgba(46,199,242,0.25)",
    },
    outline: {
      background:"transparent", color:"#2EC7F2",
      border:"1px solid rgba(46,199,242,0.25)",
      backdropFilter:"blur(10px)",
    },
    ghost: {
      background:"rgba(46,199,242,0.06)", color:"#2EC7F2",
      border:"1px solid transparent",
    },
    danger: {
      background:"rgba(255,77,109,0.10)", color:"#FF4D6D",
      border:"1px solid rgba(255,77,109,0.28)",
    },
  };

  const base = {
    display:"inline-flex", alignItems:"center", justifyContent:"center",
    gap:8, fontFamily:"inherit", fontWeight:700, cursor:"pointer",
    transition:"all 0.2s ease", position:"relative", overflow:"hidden",
    whiteSpace:"nowrap", letterSpacing:"0.3px",
    opacity: disabled || loading ? 0.5 : 1,
    pointerEvents: disabled || loading ? "none" : "auto",
    width: fullWidth ? "100%" : "auto",
    ...sizes[size] || sizes.md,
    ...variants[variant] || variants.primary,
    ...style,
  };

  return (
    <button style={base} onClick={onClick} disabled={disabled || loading}>
      {loading && (
        <span style={{
          position:"absolute", width:16, height:16,
          border:"2px solid currentColor", borderTopColor:"transparent",
          borderRadius:"50%", animation:"spin 0.7s linear infinite",
        }} />
      )}
      <span style={{ visibility: loading ? "hidden" : "visible" }}>
        {children}
      </span>
    </button>
  );
}