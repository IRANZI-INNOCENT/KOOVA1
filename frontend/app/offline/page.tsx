export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        background: "#FAFAF8",
        color: "#17211D",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#176B4D",
        }}
      >
        Offline
      </p>
      <h1 style={{ margin: "12px 0 0", fontSize: 28, fontWeight: 650 }}>
        You are not connected
      </h1>
      <p style={{ margin: "8px 0 0", maxWidth: 420, fontSize: 14, lineHeight: 1.6, color: "#5c6560" }}>
        KCOVA needs a network connection for live data. Your sign-in session
        is still saved. Reconnect, then open the app again.
      </p>
      <a
        href="/workspace"
        style={{
          marginTop: 32,
          background: "#176B4D",
          color: "#fff",
          padding: "12px 24px",
          fontSize: 14,
          fontWeight: 650,
          textDecoration: "none",
        }}
      >
        Try again
      </a>
    </main>
  );
}
