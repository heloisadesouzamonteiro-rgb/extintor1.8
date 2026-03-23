import { useState } from "react";
import { getSupabase, isSupabaseConfigured } from "../services/supabase";

export default function Login({ onLogin, onBack }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setErro("Supabase nao configurado no ambiente local.");
      return;
    }

    const supabase = getSupabase();
    setErro("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setLoading(false);
      setErro(error.message);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("is_active, role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      setLoading(false);
      setErro("Nao foi possivel validar o perfil do usuario.");
      await supabase.auth.signOut();
      return;
    }

    if (profileData?.is_active === false) {
      setLoading(false);
      setErro("Usuario inativo. Entre em contato com o administrador.");
      await supabase.auth.signOut();
      return;
    }

    setLoading(false);

    if (data.user) {
      onLogin(data.user);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.page}>
        <div style={styles.brand}>
          <h1 style={styles.brandTitle}>ExtintorIA</h1>
          <span style={styles.brandSubtitle}>
            Gestão inteligente de inspeções e clientes
          </span>
        </div>

        <div style={styles.container}>
          <div style={styles.logo}>
            <h2 style={styles.logoTitle}>Painel de acesso do sistema</h2>
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                autoComplete="username"
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Senha</label>
              <input
                type="password"
                placeholder="********"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                style={styles.input}
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>

            {erro && <p style={styles.error}>{erro}</p>}
          </form>

          <div style={styles.links}>
            {onBack ? (
              <button type="button" onClick={onBack} style={styles.backButton}>
                Voltar para a pagina inicial
              </button>
            ) : null}
            <a href="#" style={styles.link}>Esqueci minha senha</a>
          </div>

          <div style={styles.footer}>© 2026 ExtintorIA</div>
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
    maxWidth: "420px",
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

  logo: {
    textAlign: "center",
    marginBottom: "25px",
  },

  logoTitle: {
    color: "#0F172A",
    fontWeight: "600",
    fontSize: "24px",
    marginBottom: 0,
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

  links: {
    marginTop: "15px",
    textAlign: "center",
    fontSize: "13px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  link: {
    color: "#1DB954",
    textDecoration: "none",
  },

  backButton: {
    border: "1px solid #D7E0EA",
    background: "#F8FAFC",
    color: "#0F172A",
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },

  footer: {
    marginTop: "20px",
    textAlign: "center",
    fontSize: "12px",
    color: "#94A3B8",
  },

  error: {
    color: "#dc2626",
    fontSize: "14px",
    textAlign: "center",
    marginTop: "6px",
  },
};
