import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "./services/supabase";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ForcePasswordReset from "./pages/ForcePasswordReset";
import PublicLanding from "./pages/PublicLanding";
import RevenueCalculatorPage from "./pages/RevenueCalculatorPage";
import ChecklistNr23Page from "./pages/ChecklistNr23Page";

export default function App() {
  const pathname = normalizePath(window.location.pathname);
  const isLandingRoute = pathname === "/landing";
  const isCalculatorRoute = pathname === "/calculadora";
  const isChecklistRoute = pathname === "/checklist-nr23";
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (isLandingRoute || isCalculatorRoute || isChecklistRoute) {
      setCheckingSession(false);
      return undefined;
    }

    if (!isSupabaseConfigured) {
      setCheckingSession(false);
      return undefined;
    }

    const supabase = getSupabase();
    let active = true;

    async function loadProfile(authUser) {
      if (!authUser) {
        if (active) {
          setProfile(null);
        }
        return null;
      }

      try {
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("id, company_id, role, is_active, name")
          .eq("id", authUser.id)
          .maybeSingle();

        if (error) {
          console.error("Erro ao carregar perfil:", error.message);
        }

        const nextProfile = profileData ?? null;

        if (nextProfile && nextProfile.is_active === false) {
          await supabase.auth.signOut();

          if (active) {
            setUser(null);
            setProfile(null);
          }

          return null;
        }

        const normalizedProfile = nextProfile
          ? {
              ...nextProfile,
              must_change_password: authUser?.user_metadata?.must_change_password === true,
            }
          : null;

        if (active) {
          setProfile(normalizedProfile);
        }

        return normalizedProfile;
      } catch (error) {
        console.error("Erro inesperado ao carregar perfil:", error);

        if (active) {
          setProfile(null);
        }

        return null;
      }
    }

    async function bootstrapSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const authUser = session?.user ?? null;

        if (active) {
          setUser(authUser);
        }

        await loadProfile(authUser);

        if (active) {
          setCheckingSession(false);
        }
      } catch (error) {
        console.error("Erro ao carregar sess?o:", error);

        if (active) {
          setUser(null);
          setProfile(null);
          setCheckingSession(false);
        }
      }
    }

    bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setCheckingSession(false);
        return;
      }

      const authUser = session?.user ?? null;
      setUser(authUser);
      void (async () => {
        await loadProfile(authUser);
        if (active) {
          setCheckingSession(false);
        }
      })();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    const supabase = getSupabase();

    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setProfile(null);
      setCheckingSession(false);
    }
  }

  if (checkingSession) {
    return <div style={{ padding: 30 }}>Carregando...</div>;
  }

  if (isLandingRoute) {
    return <PublicLanding onOpenLogin={() => window.location.assign("/")} />;
  }

  if (isCalculatorRoute) {
    return <RevenueCalculatorPage />;
  }

  if (isChecklistRoute) {
    return <ChecklistNr23Page />;
  }

  if (!isSupabaseConfigured) {
    return (
      <div style={styles.configShell}>
        <div style={styles.configCard}>
          <span style={styles.configEyebrow}>Configuracao necessaria</span>
          <h1 style={styles.configTitle}>O sistema precisa das variaveis do Supabase para abrir o painel.</h1>
          <p style={styles.configText}>
            Para acessar a landing page agora, use <strong>/landing</strong>. Para o painel principal funcionar no
            ambiente local, garanta que o arquivo <strong>.env</strong> exista com
            <strong> VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong>.
          </p>
          <div style={styles.configActions}>
            <button style={styles.primaryButton} onClick={() => window.location.assign("/landing")}>
              Abrir landing page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (user && profile?.must_change_password) {
    return (
      <ForcePasswordReset
        onCompleted={async () => {
          const supabase = getSupabase();
          await supabase.auth.refreshSession();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.user) {
            setUser(null);
            setProfile(null);
            return;
          }

          setUser(session.user);
          setProfile((prev) => (prev ? { ...prev, must_change_password: false } : prev));
        }}
      />
    );
  }

  return user ? (
    <Dashboard user={user} profile={profile} onLogout={handleLogout} />
  ) : (
    showLogin ? (
      <Login onLogin={setUser} onBack={() => setShowLogin(false)} />
    ) : (
      <PublicLanding onOpenLogin={() => setShowLogin(true)} />
    )
  );
}

function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

const styles = {
  configShell: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "linear-gradient(180deg, #071224 0%, #0f172a 100%)",
  },
  configCard: {
    width: "100%",
    maxWidth: "720px",
    borderRadius: "28px",
    padding: "32px",
    background: "rgba(255,255,255,0.96)",
    boxShadow: "0 30px 60px rgba(2,6,23,0.28)",
  },
  configEyebrow: {
    display: "inline-flex",
    padding: "6px 12px",
    borderRadius: "999px",
    background: "rgba(29,185,84,0.12)",
    color: "#15803d",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "16px",
  },
  configTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "2rem",
    lineHeight: 1.1,
  },
  configText: {
    color: "#475569",
    fontSize: "1rem",
    lineHeight: 1.7,
    margin: "14px 0 0 0",
  },
  configActions: {
    marginTop: "22px",
  },
  primaryButton: {
    border: "none",
    borderRadius: "14px",
    padding: "14px 18px",
    background: "linear-gradient(135deg, #1DB954 0%, #149946 100%)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
