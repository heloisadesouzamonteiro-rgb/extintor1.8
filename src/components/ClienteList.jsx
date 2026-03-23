import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import ConfirmDialog from "./ConfirmDialog";

export default function ClienteList({ onSelect, onEdit }) {
  const [clientes, setClientes] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    async function fetchClientes() {
      setLoading(true);
      setError("");

      const from = (page - 1) * 10;
      const to = from + 9;

      const { data, count, error } = await supabase
        .from("clients")
        .select("*", { count: "exact" })
        .range(from, to)
        .order("created_at", { ascending: false });

      setLoading(false);

      if (!error) {
        setClientes(data);
        setTotal(count);
      } else {
        setError("Nao foi possivel carregar os clientes.");
      }
    }

    fetchClientes();
  }, [page]);

  const totalPages = Math.ceil(total / 10);

  async function handleDelete(cliente) {
    setDeletingId(cliente.id);
    setError("");

    const { error } = await supabase.from("clients").delete().eq("id", cliente.id);

    setDeletingId("");

    if (error) {
      setError("Nao foi possivel excluir o cliente. " + error.message);
      return;
    }

    setClientes((prev) => prev.filter((item) => item.id !== cliente.id));
    setTotal((prev) => Math.max(0, prev - 1));
  }

  return (
    <div style={styles.wrapper}>

      <div style={styles.header}>
        <h2 style={styles.title}>Clientes</h2>
        <span style={styles.subtitle}>
          Empresas cadastradas no sistema
        </span>
      </div>

      <div style={styles.card}>
        {error ? <div style={styles.errorBox}>{error}</div> : null}

        {loading && (
          <div style={styles.loadingBox}>
            <div style={styles.loader}></div>
            <span>Carregando clientes...</span>
          </div>
        )}

        {!loading && clientes.length === 0 && (
          <div style={styles.empty}>
            Nenhum cliente cadastrado ainda.
          </div>
        )}

        {!loading && clientes.map(cliente => (
          <div key={cliente.id} style={styles.item}>

            <div style={styles.info}>
              <div style={styles.name}>{cliente.name}</div>
              <div style={styles.email}>
                {cliente.email || "Sem email"}
              </div>
            </div>

            <div style={styles.actions}>
              <button
                style={styles.buttonPrimary}
                onClick={() => onEdit(cliente)}
              >
                Editar
              </button>

              <button
                style={styles.buttonDanger}
                onClick={() => setPendingDelete(cliente)}
                disabled={deletingId === cliente.id}
              >
                {deletingId === cliente.id ? "Excluindo..." : "Excluir cliente"}
              </button>
            </div>

          </div>
        ))}

        <div style={styles.pagination}>

          <button
            style={styles.buttonPage}
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            ← Anterior
          </button>

          <span style={styles.pageInfo}>
            Página {page} de {totalPages || 1}
          </span>

          <button
            style={styles.buttonPage}
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage(page + 1)}
          >
            Próxima →
          </button>

        </div>

      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir cliente"
        message={`Tem certeza que deseja excluir o cliente ${pendingDelete?.name || ""}?`}
        confirmLabel="Excluir cliente"
        tone="danger"
        loading={deletingId === pendingDelete?.id}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await handleDelete(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

const styles = {

  wrapper: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    fontFamily: "Inter, sans-serif"
  },

  header: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },

  title: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#0F172A",
    margin: 0
  },

  subtitle: {
    fontSize: "14px",
    color: "#64748B"
  },

  card: {
    background: "#FFFFFF",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },

  errorBox: {
    padding: "14px 16px",
    borderRadius: "12px",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#B91C1C",
    fontSize: "14px",
  },

  loadingBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#64748B",
    fontSize: "14px",
    padding: "16px"
  },

  loader: {
    width: "16px",
    height: "16px",
    border: "2px solid #CBD5E1",
    borderTop: "2px solid #1DB954",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite"
  },

  empty: {
    padding: "20px",
    textAlign: "center",
    color: "#64748B"
  },

  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    borderRadius: "10px",
    border: "1px solid #E2E8F0",
    transition: "0.2s",
    background: "#F8FAFC"
  },

  info: {
    display: "flex",
    flexDirection: "column",
    gap: "3px"
  },

  name: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#0F172A"
  },

  email: {
    fontSize: "13px",
    color: "#64748B"
  },

  actions: {
    display: "flex",
    gap: "8px"
  },

  buttonPrimary: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    background: "#1DB954",
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer"
  },

  buttonSecondary: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    background: "#E2E8F0",
    color: "#0F172A",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer"
  },

  buttonDanger: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    background: "#FEE2E2",
    color: "#B91C1C",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer"
  },

  pagination: {
    marginTop: "14px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "12px"
  },

  buttonPage: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    background: "#0F172A",
    color: "#FFFFFF",
    fontWeight: "500",
    cursor: "pointer"
  },

  pageInfo: {
    fontSize: "14px",
    color: "#64748B"
  }
};
