import { useState } from "react";
import { supabase } from "../services/supabase";

export default function ForcePasswordReset({ onCompleted }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("A confirmacao da senha nao confere.");
      return;
    }

    setLoading(true);
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      setLoading(false);
      setError("Nao foi possivel validar a sessao do usuario.");
      return;
    }

    const { error: updateAuthError } = await supabase.auth.updateUser({
      password,
      data: {
        ...(session.user.user_metadata ?? {}),
        must_change_password: false,
      },
    });

    if (updateAuthError) {
      setLoading(false);
      setError("Nao foi possivel atualizar a senha. " + updateAuthError.message);
      return;
    }

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", session.user.id);

    setLoading(false);

    if (profileUpdateError && !/must_change_password/i.test(profileUpdateError.message)) {
      setError("Senha atualizada, mas nao foi possivel sincronizar o perfil. " + profileUpdateError.message);
      return;
    }

    setSuccess("Senha atualizada com sucesso. Redirecionando para o painel...");

    setTimeout(() => {
      if (onCompleted) onCompleted();
    }, 800);
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.page}>
        <div style={styles.brand}>
          <h1 style={styles.brandTitle}>ExtintorIA</h1>
          <span style={styles.brandSubtitle}>Primeiro acesso do tecnico</span>
        </div>

        <div style={styles.container}>
          <h2 style={styles.title}>Troca obrigatoria de senha</h2>
          <p style={styles.subtitle}>
            Para continuar, defina uma nova senha pessoal e segura.
          </p>

          {(error || success) && (
            <div style={{ ...styles.alert, ...(error ? styles.alertError : styles.alertSuccess) }}>
              {error || success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nova senha</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                style={styles.input}
                autoComplete="new-password"
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirmar nova senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                style={styles.input}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Salvando..." : "Atualizar senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    width: "100vw",
    height: "100vh",
    background: "#0F172A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Inter, sans-serif",
    padding: "32px 16px",
    overflow: "auto",
    zIndex: 9999,
  },
  page: {
    width: "100%",
    maxWidth: "460px",
  },
  brand: {
    textAlign: "center",
    marginBottom: "28px",
  },
  brandTitle: {
    color: "#1DB954",
    fontWeight: "600",
    fontSize: "30px",
    marginBottom: "6px",
  },
  brandSubtitle: {
    color: "#CBD5E1",
    fontSize: "14px",
  },
  container: {
    background: "#fff",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 15px 40px rgba(0,0,0,0.25)",
  },
  title: {
    color: "#1DB954",
    fontWeight: "600",
    fontSize: "28px",
    margin: "0 0 8px",
  },
  subtitle: {
    color: "#0F172A",
    fontSize: "14px",
    lineHeight: 1.6,
    margin: "0 0 20px",
  },
  alert: {
    borderRadius: "12px",
    padding: "14px 16px",
    fontSize: "14px",
    fontWeight: 500,
    marginBottom: "18px",
  },
  alertError: {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#B91C1C",
  },
  alertSuccess: {
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    color: "#15803D",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "13px",
    marginBottom: "6px",
    color: "#334155",
    fontWeight: "500",
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #CBD5E1",
    fontSize: "14px",
    outline: "none",
    background: "#fff",
    color: "#0F172A",
    boxSizing: "border-box",
  },
  button: {
    marginTop: "10px",
    padding: "13px",
    borderRadius: "8px",
    border: "none",
    background: "#1DB954",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
  },
};
