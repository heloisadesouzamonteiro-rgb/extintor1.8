export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  loading = false,
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={loading ? undefined : onClose}>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.header}>
          <span style={{ ...styles.badge, ...(tone === "danger" ? styles.badgeDanger : styles.badgePrimary) }}>
            {tone === "danger" ? "Confirmacao" : "Acao"}
          </span>
          <h3 style={styles.title}>{title}</h3>
          <p style={styles.message}>{message}</p>
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.buttonSecondary} onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            style={{ ...styles.buttonPrimary, ...(tone === "danger" ? styles.buttonDanger : null) }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.55)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 9999,
  },
  modal: {
    width: "100%",
    maxWidth: "460px",
    borderRadius: "24px",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
    border: "1px solid rgba(226,232,240,0.95)",
    boxShadow: "0 30px 80px rgba(15,23,42,0.30)",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    fontFamily: "Inter, sans-serif",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  badge: {
    alignSelf: "flex-start",
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  badgePrimary: {
    background: "rgba(29,185,84,0.14)",
    color: "#15803D",
  },
  badgeDanger: {
    background: "rgba(239,68,68,0.12)",
    color: "#B91C1C",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    lineHeight: 1.15,
    color: "#0F172A",
    fontWeight: "800",
    letterSpacing: "-0.03em",
  },
  message: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#475569",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    flexWrap: "wrap",
  },
  buttonSecondary: {
    minWidth: "120px",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid #D7E0EA",
    background: "#FFFFFF",
    color: "#0F172A",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  buttonPrimary: {
    minWidth: "140px",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #1DB954 0%, #169c47 100%)",
    color: "#FFFFFF",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(29,185,84,0.22)",
  },
  buttonDanger: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    boxShadow: "0 12px 24px rgba(239,68,68,0.22)",
  },
};
