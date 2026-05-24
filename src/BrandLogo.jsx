// Логотип + название "Mindes" для шапки.
// На нативном Android (Capacitor) — только иконка без текста.

const IS_NATIVE = Boolean(window?.Capacitor?.isNativePlatform?.());

export default function BrandLogo({ size = 32, fontSize = 17, onClick, style }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      <img
        src="/icon.svg"
        alt="Mindes"
        width={size}
        height={size}
        style={{ borderRadius: size * 0.27, display: "block", flexShrink: 0 }}
        draggable={false}
      />
      {!IS_NATIVE && (
        <span style={{
          fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
          fontSize,
          fontWeight: 800,
          letterSpacing: "-0.3px",
          lineHeight: 1,
        }}>
          <span style={{ color: "#5b3fc4" }}>M</span>
          <span style={{ color: "inherit" }}>indes</span>
        </span>
      )}
    </div>
  );
}
