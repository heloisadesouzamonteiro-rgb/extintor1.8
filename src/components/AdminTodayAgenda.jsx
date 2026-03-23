import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return { start, end };
}

export default function AdminTodayAgenda({ companyId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAgenda() {
      if (!companyId) {
        setItems([]);
        return;
      }

      setLoading(true);
      setError("");

      const { start, end } = getTodayRange();
      const { data: inspections, error: inspectionsError } = await supabase
        .from("inspections")
        .select("id, client_id, unit_id, technician_id, inspected_at, result")
        .eq("company_id", companyId)
        .gte("inspected_at", start.toISOString())
        .lt("inspected_at", end.toISOString())
        .order("inspected_at", { ascending: true });

      if (inspectionsError) {
        setLoading(false);
        setError("Nao foi possivel carregar a agenda de hoje.");
        return;
      }

      const clientIds = [...new Set((inspections || []).map((item) => item.client_id).filter(Boolean))];
      const unitIds = [...new Set((inspections || []).map((item) => item.unit_id).filter(Boolean))];
      const technicianIds = [...new Set((inspections || []).map((item) => item.technician_id).filter(Boolean))];

      const [clientsRes, unitsRes, techniciansRes] = await Promise.all([
        clientIds.length > 0
          ? supabase.from("clients").select("id, name").in("id", clientIds)
          : Promise.resolve({ data: [], error: null }),
        unitIds.length > 0
          ? supabase.from("units").select("id, name").in("id", unitIds)
          : Promise.resolve({ data: [], error: null }),
        technicianIds.length > 0
          ? supabase.from("profiles").select("id, name").in("id", technicianIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      setLoading(false);

      if (clientsRes.error || unitsRes.error || techniciansRes.error) {
        setError("Nao foi possivel completar a agenda de hoje.");
        return;
      }

      const clientsById = new Map((clientsRes.data || []).map((item) => [item.id, item.name]));
      const unitsById = new Map((unitsRes.data || []).map((item) => [item.id, item.name]));
      const techniciansById = new Map((techniciansRes.data || []).map((item) => [item.id, item.name]));

      setItems(
        (inspections || []).map((item) => ({
          id: item.id,
          time: new Intl.DateTimeFormat("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(item.inspected_at)),
          technician: techniciansById.get(item.technician_id) || "Tecnico nao identificado",
          client: clientsById.get(item.client_id) || "Cliente nao identificado",
          unit: item.unit_id ? unitsById.get(item.unit_id) || "" : "",
          status: item.result || "-",
        })),
      );
    }

    fetchAgenda();
  }, [companyId]);

  return (
    <section style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>Agenda de hoje</span>
          <h3 style={styles.title}>Visitas do dia</h3>
          <p style={styles.subtitle}>
            Resumo das inspecoes registradas para hoje, com tecnico, cliente e status.
          </p>
        </div>
        <div style={styles.counter}>{items.length} visita{items.length === 1 ? "" : "s"}</div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}
      {loading && <div style={styles.loadingBox}>Carregando agenda...</div>}

      {!loading && !error && items.length === 0 && (
        <div style={styles.emptyBox}>Nenhuma visita registrada para hoje.</div>
      )}

      {!loading && !error && items.length > 0 && (
        <div style={styles.list}>
          {items.map((item) => (
            <div key={item.id} style={styles.row}>
              <div style={styles.time}>{item.time}</div>
              <div style={styles.content}>
                <strong style={styles.technician}>{item.technician}</strong>
                <span style={styles.client}>{item.client}{item.unit ? ` - ${item.unit}` : ""}</span>
              </div>
              <div style={styles.status}>{item.status}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const styles = {
  wrapper: {
    background: "#FFFFFF",
    border: "1px solid rgba(226,232,240,0.95)",
    borderRadius: "24px",
    boxShadow: "0 22px 50px rgba(15,23,42,0.08)",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
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
    fontSize: "1.6rem",
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    margin: "8px 0 0 0",
    color: "#64748B",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  counter: {
    padding: "10px 14px",
    borderRadius: "999px",
    background: "#F8FAFC",
    color: "#0F172A",
    fontWeight: 700,
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
  emptyBox: {
    padding: "18px",
    borderRadius: "16px",
    background: "#F8FAFC",
    color: "#64748B",
    textAlign: "center",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "88px 1fr auto",
    gap: "16px",
    alignItems: "center",
    padding: "16px",
    borderRadius: "16px",
    background: "#F8FAFC",
    border: "1px solid rgba(226,232,240,0.9)",
  },
  time: {
    fontSize: "1.1rem",
    fontWeight: 800,
    color: "#0F172A",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  technician: {
    color: "#0F172A",
    fontSize: "0.98rem",
  },
  client: {
    color: "#64748B",
    fontSize: "0.93rem",
  },
  status: {
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(29,185,84,0.12)",
    color: "#15803D",
    fontSize: "0.82rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
};
