import { Component } from "react";

// Error Boundary — перехватывает JS-ошибки в дочерних компонентах
// и показывает понятный экран вместо белого пустого окна.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const msg = this.state.error?.message || String(this.state.error);

    return (
      <div style={{
        width: "100%", height: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0c0c18", color: "#ddd",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: 32, boxSizing: "border-box", textAlign: "center", gap: 16,
      }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
          Что-то пошло не так
        </div>
        <div style={{
          fontSize: 13, color: "#888", maxWidth: 480,
          background: "#1a1a28", border: "1px solid #2a2a3a",
          borderRadius: 10, padding: "12px 16px",
          fontFamily: "monospace", textAlign: "left", wordBreak: "break-word",
        }}>
          {msg}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8,
            padding: "10px 24px", borderRadius: 10,
            background: "#5b3fc4", color: "#fff",
            border: "none", fontSize: 14, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Перезагрузить
        </button>
      </div>
    );
  }
}
