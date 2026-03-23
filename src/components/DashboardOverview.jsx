import { useEffect, useMemo, useState } from "react";

import { supabase } from "../services/supabase";



function getCurrentMonthRange() {

  const now = new Date();

  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

  return { start, end };

}



const CARD_META = {

  total: { label: "Inspeções no mês", icon: GridIcon, tone: "green" },

  aprovado: { label: "Aprovados", icon: CheckIcon, tone: "greenSoft" },

  reprovado: { label: "Reprovados", icon: AlertIcon, tone: "rose" },

  manutencao: { label: "Manutenção", icon: WrenchIcon, tone: "slate" },

  recarga: { label: "Recarga", icon: BoltIcon, tone: "greenSoft" },

  substituicao: { label: "Substituição", icon: RefreshIcon, tone: "amber" },

  clientes: { label: "Clientes ativos", icon: BuildingIcon, tone: "slate" },

  extintores: { label: "Extintores cadastrados", icon: ShieldIcon, tone: "green" },

};



export default function DashboardOverview() {

  const [companyId, setCompanyId] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [summary, setSummary] = useState({

    total: 0,

    aprovado: 0,

    reprovado: 0,

    manutencao: 0,

    recarga: 0,

    substituicao: 0,

    clientes: 0,

    extintores: 0,

  });



  useEffect(() => {

    async function bootstrap() {

      const {

        data: { session },

      } = await supabase.auth.getSession();



      if (!session?.user) {

        setError("Usuário não autenticado.");

        return;

      }



      const { data: profile, error: profileError } = await supabase

        .from("profiles")

        .select("company_id")

        .eq("id", session.user.id)

        .single();



      if (profileError || !profile?.company_id) {

        setError("Não foi possível identificar a empresa logada.");

        return;

      }



      setCompanyId(profile.company_id);

    }



    bootstrap();

  }, []);



  useEffect(() => {

    async function fetchSummary() {

      if (!companyId) return;



      setLoading(true);

      setError("");



      const { start, end } = getCurrentMonthRange();



      const [inspectionsResponse, clientsResponse, extinguishersResponse] = await Promise.all([

        supabase

          .from("inspections")

          .select("result", { count: "exact" })

          .eq("company_id", companyId)

          .gte("inspected_at", start.toISOString())

          .lt("inspected_at", end.toISOString()),

        supabase

          .from("clients")

          .select("id", { count: "exact" })

          .eq("company_id", companyId),

        supabase

          .from("extinguishers")

          .select("id", { count: "exact" })

          .eq("company_id", companyId),

      ]);



      setLoading(false);



      if (inspectionsResponse.error || clientsResponse.error || extinguishersResponse.error) {

        setError("Não foi possível carregar os indicadores do painel.");

        return;

      }



      const inspections = inspectionsResponse.data || [];

      setSummary({

        total: inspections.length,

        aprovado: inspections.filter((item) => item.result === "APROVADO").length,

        reprovado: inspections.filter((item) => item.result === "REPROVADO").length,

        manutencao: inspections.filter((item) => item.result === "MANUTENCAO").length,

        recarga: inspections.filter((item) => item.result === "RECARGA").length,

        substituicao: inspections.filter((item) => item.result === "SUBSTITUICAO").length,

        clientes: clientsResponse.count || 0,

        extintores: extinguishersResponse.count || 0,

      });

    }



    fetchSummary();

  }, [companyId]);



  const cards = useMemo(

    () => [

      ["total", summary.total],

      ["aprovado", summary.aprovado],

      ["reprovado", summary.reprovado],

      ["manutencao", summary.manutencao],

      ["recarga", summary.recarga],

      ["substituicao", summary.substituicao],

      ["clientes", summary.clientes],

      ["extintores", summary.extintores],

    ],

    [summary],

  );



  return (

    <section style={styles.wrapper}>

      <div style={styles.header}>

        <div>

          <span style={styles.eyebrow}>Resumo mensal</span>

          <h3 style={styles.title}>Visão do mês</h3>

          <p style={styles.subtitle}>Indicadores principais com leitura rápida para acompanhar a operação sem sair da tela inicial.</p>

        </div>

      </div>



      {error && <div style={styles.errorBox}>{error}</div>}

      {loading && <div style={styles.loadingBox}>Carregando indicadores...</div>}



      {!loading && !error && (

        <div style={styles.grid}>

          {cards.map(([key, value]) => {

            const meta = CARD_META[key];

            const Icon = meta.icon;

            return (

              <div key={key} style={{ ...styles.card, ...toneStyles[meta.tone] }}>

                <div style={styles.cardHeader}>

                  <div style={{ ...styles.iconBadge, ...iconToneStyles[meta.tone] }}>

                    <Icon />

                  </div>

                  <span style={styles.cardLabel}>{meta.label}</span>

                </div>

                <div style={styles.cardValue}>{value}</div>

              </div>

            );

          })}

        </div>

      )}

    </section>

  );

}



function GridIcon() {

  return (

    <svg viewBox="0 0 24 24" style={styles.icon} aria-hidden="true">

      <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" fill="currentColor" />

    </svg>

  );

}



function CheckIcon() {

  return (

    <svg viewBox="0 0 24 24" style={styles.icon} aria-hidden="true">

      <path d="m9.55 17.3-4.6-4.6 1.4-1.4 3.2 3.2 7.9-7.9 1.4 1.4-9.3 9.3Z" fill="currentColor" />

    </svg>

  );

}



function AlertIcon() {

  return (

    <svg viewBox="0 0 24 24" style={styles.icon} aria-hidden="true">

      <path d="M12 3 2 21h20L12 3Zm1 14h-2v-2h2v2Zm0-4h-2V9h2v4Z" fill="currentColor" />

    </svg>

  );

}



function WrenchIcon() {

  return (

    <svg viewBox="0 0 24 24" style={styles.icon} aria-hidden="true">

      <path d="M21 7.5a5.5 5.5 0 0 1-7.54 5.1L6.1 19.97a1.75 1.75 0 1 1-2.47-2.47l7.37-7.36A5.5 5.5 0 0 1 16.5 3a4.7 4.7 0 0 0-.1 1A4.5 4.5 0 0 0 20 7.6c.34 0 .67-.04 1-.1Z" fill="currentColor" />

    </svg>

  );

}



function BoltIcon() {

  return (

    <svg viewBox="0 0 24 24" style={styles.icon} aria-hidden="true">

      <path d="M13 2 5 14h5l-1 8 8-12h-5l1-8Z" fill="currentColor" />

    </svg>

  );

}



function RefreshIcon() {

  return (

    <svg viewBox="0 0 24 24" style={styles.icon} aria-hidden="true">

      <path d="M12 5a7 7 0 0 1 6.65 4.83H16v2h5V7h-2v2.06A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7Z" fill="currentColor" />

    </svg>

  );

}



function BuildingIcon() {

  return (

    <svg viewBox="0 0 24 24" style={styles.icon} aria-hidden="true">

      <path d="M4 20V6.5C4 5.67 4.67 5 5.5 5H10v15H4Zm10 0V3.5c0-.83.67-1.5 1.5-1.5h3C19.33 2 20 2.67 20 3.5V20h-6Z" fill="currentColor" />

    </svg>

  );

}



function ShieldIcon() {

  return (

    <svg viewBox="0 0 24 24" style={styles.icon} aria-hidden="true">

      <path d="M12 2 5 5v6c0 5.25 3.4 10.16 7 11 3.6-.84 7-5.75 7-11V5l-7-3Z" fill="currentColor" />

    </svg>

  );

}



const toneStyles = {

  green: {

    background: "linear-gradient(180deg, #FFFFFF 0%, #F4FFF7 100%)",

  },

  greenSoft: {

    background: "linear-gradient(180deg, #FFFFFF 0%, #F8FFFB 100%)",

  },

  rose: {

    background: "linear-gradient(180deg, #FFFFFF 0%, #FFF8F8 100%)",

  },

  amber: {

    background: "linear-gradient(180deg, #FFFFFF 0%, #FFFCF5 100%)",

  },

  slate: {

    background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",

  },

};



const iconToneStyles = {

  green: {

    background: "rgba(29,185,84,0.12)",

    color: "#15803D",

  },

  greenSoft: {

    background: "rgba(34,197,94,0.10)",

    color: "#16A34A",

  },

  rose: {

    background: "rgba(244,63,94,0.10)",

    color: "#E11D48",

  },

  amber: {

    background: "rgba(245,158,11,0.12)",

    color: "#D97706",

  },

  slate: {

    background: "rgba(15,23,42,0.08)",

    color: "#0F172A",

  },

};



const styles = {

  wrapper: {

    width: "100%",

    display: "flex",

    flexDirection: "column",

    gap: "18px",

    padding: "24px",

    borderRadius: "24px",

    background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",

    border: "1px solid rgba(226,232,240,0.9)",

    boxShadow: "0 22px 50px rgba(15,23,42,0.08)",

    boxSizing: "border-box",

  },

  header: {

    display: "flex",

    justifyContent: "space-between",

    alignItems: "center",

    gap: "12px",

    flexWrap: "wrap",

  },

  eyebrow: {

    display: "inline-flex",

    alignItems: "center",

    padding: "6px 11px",

    borderRadius: "999px",

    background: "rgba(29,185,84,0.12)",

    color: "#15803D",

    fontSize: "12px",

    fontWeight: "700",

    textTransform: "uppercase",

    letterSpacing: "0.08em",

    marginBottom: "12px",

  },

  title: {

    margin: 0,

    fontSize: "1.7rem",

    fontWeight: "800",

    color: "#0F172A",

    letterSpacing: "-0.03em",

  },

  subtitle: {

    margin: "8px 0 0 0",

    color: "#64748B",

    fontSize: "14px",

    lineHeight: 1.7,

    maxWidth: "720px",

  },

  errorBox: {

    padding: "14px 16px",

    borderRadius: "14px",

    background: "#FEF2F2",

    border: "1px solid #FECACA",

    color: "#B91C1C",

    fontSize: "14px",

  },

  loadingBox: {

    color: "#64748B",

    fontSize: "14px",

  },

  grid: {

    display: "grid",

    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",

    gap: "16px",

  },

  card: {

    border: "1px solid rgba(226,232,240,0.95)",

    borderRadius: "22px",

    padding: "18px",

    boxShadow: "0 14px 30px rgba(15,23,42,0.06)",

  },

  cardHeader: {

    display: "flex",

    alignItems: "center",

    gap: "12px",

    marginBottom: "16px",

  },

  iconBadge: {

    width: "42px",

    height: "42px",

    borderRadius: "14px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    flexShrink: 0,

  },

  icon: {

    width: "20px",

    height: "20px",

  },

  cardLabel: {

    color: "#64748B",

    fontSize: "12px",

    fontWeight: "700",

    textTransform: "uppercase",

    letterSpacing: "0.05em",

  },

  cardValue: {

    color: "#0F172A",

    fontSize: "2.2rem",

    fontWeight: "800",

    lineHeight: 1,

    letterSpacing: "-0.04em",

  },

};


