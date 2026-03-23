import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function ExtintorList({ onSelect, onEdit }) {
  const [extintores, setExtintores] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [clientesMap, setClientesMap] = useState({});

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const from = (page - 1) * 10;
      const to = from + 9;

      const { data: extintoresData, count, error: extintorError } = await supabase
        .from("extinguishers")
        .select("*", { count: "exact" })
        .range(from, to)
        .order("created_at", { ascending: false });

      const { data: clientesData, error: clienteError } = await supabase.from("clients").select("id, name");

      setLoading(false);

      if (!extintorError && !clienteError) {
        setExtintores(extintoresData || []);
        setTotal(count || 0);

        const map = {};
        (clientesData || []).forEach((cliente) => {
          map[cliente.id] = cliente.name;
        });

        setClientesMap(map);
      }
    }

    fetchData();
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>Extintores</h2>
        <span style={styles.subtitle}>Lista de equipamentos cadastrados</span>
      </div>

      <div style={styles.card}>
        {loading ? (
          <div style={styles.loadingBox}>
            <span style={styles.loading}>Carregando extintores...</span>
          </div>
        ) : null}

        {!loading && extintores.length === 0 ? <div style={styles.emptyState}>Nenhum extintor cadastrado ainda.</div> : null}

        {!loading
          ? extintores.map((extintor) => (
              <div key={extintor.id} style={styles.item}>
                <div style={styles.info}>
                  <strong style={styles.itemTitle}>{extintor.internal_code || "Sem codigo"}</strong>

                  <span style={styles.itemText}>
                    {extintor.extinguisher_type || "Tipo nao informado"}
                    {extintor.capacity ? ` • ${extintor.capacity}` : ""}
                  </span>

                  <span style={styles.itemText}>
                    {extintor.location_description || "Localizacao nao informada"}
                    {extintor.sector ? ` • ${extintor.sector}` : ""}
                  </span>

                  <span style={styles.itemMeta}>
                    Serie: {extintor.serial_number || "-"}
                    {extintor.standard_code ? ` • Norma: ${extintor.standard_code}` : ""}
                    {extintor.seal_number ? ` • Selo: ${extintor.seal_number}` : ""}
                  </span>

                  <span style={styles.itemClient}>Cliente: {clientesMap[extintor.client_id] || "Nao identificado"}</span>
                </div>

                <div style={styles.actions}>
                  <button style={styles.button} onClick={() => onSelect && onSelect(extintor)}>
                    Ficha
                  </button>

                  <button style={styles.buttonSecondary} onClick={() => onEdit && onEdit(extintor)}>
                    Editar
                  </button>
                </div>
              </div>
            ))
          : null}

        <div style={styles.pagination}>
          <button style={styles.pageButton} disabled={page === 1} onClick={() => setPage(page - 1)}>
            Anterior
          </button>

          <span style={styles.pageInfo}>
            Pagina {page} de {totalPages}
          </span>

          <button style={styles.pageButton} disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Proxima
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    fontFamily: "Inter, sans-serif",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#0F172A",
    margin: 0,
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748B",
  },
  card: {
    background: "#FFFFFF",
    borderRadius: "18px",
    boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
    border: "1px solid #E2E8F0",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  loadingBox: {
    padding: "16px 0",
  },
  loading: {
    color: "#64748B",
    fontSize: "14px",
  },
  emptyState: {
    padding: "24px",
    borderRadius: "12px",
    background: "#F8FAFC",
    color: "#64748B",
    textAlign: "center",
    border: "1px dashed #CBD5E1",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    padding: "18px 0",
    borderBottom: "1px solid #E2E8F0",
    flexWrap: "wrap",
  },
  info: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: 0,
  },
  itemTitle: {
    color: "#0F172A",
    fontSize: "16px",
    fontWeight: "700",
  },
  itemText: {
    color: "#334155",
    fontSize: "14px",
  },
  itemMeta: {
    color: "#64748B",
    fontSize: "13px",
  },
  itemClient: {
    color: "#64748B",
    fontSize: "13px",
  },
  actions: {
    display: "flex",
    gap: "8px",
  },
  button: {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "none",
    background: "#1DB954",
    color: "#fff",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
  },
  buttonSecondary: {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "none",
    background: "#E2E8F0",
    color: "#0F172A",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginTop: "18px",
    flexWrap: "wrap",
  },
  pageButton: {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "none",
    background: "#0F172A",
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
  },
  pageInfo: {
    color: "#64748B",
    fontSize: "14px",
  },
};
