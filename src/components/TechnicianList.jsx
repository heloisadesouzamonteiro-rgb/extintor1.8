import { useEffect, useState } from "react";
import { supabase, invokeSupabaseFunction } from "../services/supabase";
import ConfirmDialog from "./ConfirmDialog";

export default function TechnicianList({ companyId, refreshToken = 0 }) {
  const [search, setSearch] = useState("");
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [resendingId, setResendingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingToggle, setPendingToggle] = useState(null);

  useEffect(() => {
    async function fetchTechnicians() {
      if (!companyId) {
        setTechnicians([]);
        return;
      }

      setLoading(true);
      setError("");
      setSuccess("");

      let data = null;
      let queryError = null;

      try {
        const response = await invokeSupabaseFunction("list-technicians", {
          body: {
            search: search.trim(),
          },
        });

        data = response.data;
        queryError = response.error;
      } catch (requestError) {
        setLoading(false);
        setError("Nao foi possivel carregar os tecnicos. " + (requestError instanceof Error ? requestError.message : "Erro inesperado."));
        setTechnicians([]);
        return;
      }

      setLoading(false);

      if (queryError) {
        setError("Nao foi possivel carregar os tecnicos. " + queryError.message);
        setTechnicians([]);
        return;
      }

      if (data?.error) {
        setError("Nao foi possivel carregar os tecnicos. " + data.error);
        setTechnicians([]);
        return;
      }

      setTechnicians(data?.technicians || []);
    }

    fetchTechnicians();
  }, [companyId, refreshToken, search]);

  async function handleToggleActive(technician) {
    const nextActive = !technician.is_active;

    setUpdatingId(technician.id);
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_active: nextActive })
      .eq("id", technician.id);

    setUpdatingId("");

    if (updateError) {
      setError("Nao foi possivel atualizar o tecnico. " + updateError.message);
      return;
    }

    setTechnicians((prev) =>
      prev.map((item) =>
        item.id === technician.id ? { ...item, is_active: nextActive } : item,
      ),
    );
  }

  async function handleResendConfirmation(technician) {
    setResendingId(technician.id);
    setError("");
    setSuccess("");

    let data = null;
    let resendError = null;

    try {
      const response = await invokeSupabaseFunction("resend-technician-confirmation", {
        body: {
          technicianId: technician.id,
        },
      });

      data = response.data;
      resendError = response.error;
    } catch (requestError) {
      setResendingId("");
      setError("Nao foi possivel reenviar o acesso. " + (requestError instanceof Error ? requestError.message : "Erro inesperado."));
      return;
    }

    setResendingId("");

    if (resendError) {
      let detailedMessage = resendError.message;

      if (resendError.context) {
        try {
          const responsePayload = await resendError.context.json();
          if (responsePayload?.error) {
            detailedMessage = responsePayload.error;
          } else if (responsePayload?.message) {
            detailedMessage = responsePayload.message;
          }
        } catch {
          try {
            const fallbackText = await resendError.context.text();
            if (fallbackText) {
              detailedMessage = fallbackText;
            }
          } catch {
            // Mantem a mensagem original quando nao for possivel ler o corpo.
          }
        }
      }

      setError("Nao foi possivel reenviar o acesso. " + detailedMessage);
      return;
    }

    if (data?.error) {
      setError("Nao foi possivel reenviar o acesso. " + data.error);
      return;
    }

    if (data?.emailSent) {
      setSuccess(`Email de acesso reenviado para ${technician.email || "o tecnico"}.`);
      return;
    }

    if (data?.temporaryPassword) {
      setSuccess(`Acesso provisoriamente atualizado. Nova senha temporaria: ${data.temporaryPassword}`);
      setTechnicians((prev) =>
        prev.map((item) =>
          item.id === technician.id ? { ...item, must_change_password: true } : item,
        ),
      );
      return;
    }

    setSuccess("Acesso provisoriamente atualizado com sucesso.");
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Tecnicos cadastrados</h3>
          <p style={styles.subtitle}>Pesquise por nome ou email e acompanhe o status da equipe da sua empresa.</p>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar tecnico por nome ou email"
          style={styles.searchInput}
        />
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}
      {success && <div style={styles.successBox}>{success}</div>}
      {loading && <div style={styles.loadingBox}>Carregando tecnicos...</div>}

      {!loading && !error && technicians.length === 0 && (
        <div style={styles.emptyBox}>Nenhum tecnico cadastrado para esta empresa.</div>
      )}

      {!loading && !error && technicians.length > 0 && (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nome</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Telefone</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Primeiro acesso</th>
                <th style={styles.th}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {technicians.map((technician) => (
                <tr key={technician.id}>
                  <td style={styles.tdStrong}>{technician.name || "-"}</td>
                  <td style={styles.td}>{technician.email || "-"}</td>
                  <td style={styles.td}>{technician.phone || "-"}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, ...(technician.is_active ? styles.statusActive : styles.statusInactive) }}>
                      {technician.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.statusBadge, ...(technician.email_verified ? styles.statusVerified : styles.statusPending) }}>
                      {technician.must_change_password ? "Pendente" : "Concluido"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionGroup}>
                      {technician.must_change_password && (
                        <button
                          type="button"
                          style={styles.actionSecondary}
                          onClick={() => handleResendConfirmation(technician)}
                          disabled={resendingId === technician.id}
                        >
                          {resendingId === technician.id ? "Enviando..." : "Reenviar acesso"}
                        </button>
                      )}
                        <button
                          type="button"
                          style={technician.is_active ? styles.actionDanger : styles.actionPrimary}
                          onClick={() => setPendingToggle(technician)}
                          disabled={updatingId === technician.id}
                        >
                        {updatingId === technician.id
                          ? "Salvando..."
                          : technician.is_active
                            ? "Desativar"
                            : "Reativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingToggle)}
        title={pendingToggle?.is_active ? "Desativar tecnico" : "Reativar tecnico"}
        message={
          pendingToggle
            ? pendingToggle.is_active
              ? `Deseja desativar ${pendingToggle.name || "este tecnico"}?`
              : `Deseja reativar ${pendingToggle.name || "este tecnico"}?`
            : ""
        }
        confirmLabel={pendingToggle?.is_active ? "Desativar" : "Reativar"}
        tone={pendingToggle?.is_active ? "danger" : "primary"}
        loading={updatingId === pendingToggle?.id}
        onClose={() => setPendingToggle(null)}
        onConfirm={async () => {
          if (!pendingToggle) return;
          await handleToggleActive(pendingToggle);
          setPendingToggle(null);
        }}
      />
    </div>
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
  title: {
    margin: 0,
    fontSize: "1.45rem",
    fontWeight: 700,
    color: "#0F172A",
  },
  subtitle: {
    margin: "6px 0 0",
    fontSize: "0.96rem",
    lineHeight: 1.6,
    color: "#64748B",
  },
  searchInput: {
    minWidth: "280px",
    maxWidth: "340px",
    width: "100%",
    borderRadius: "16px",
    border: "1px solid rgba(203,213,225,0.95)",
    background: "#FFFFFF",
    color: "#0F172A",
    padding: "14px 16px",
    fontSize: "0.98rem",
    boxSizing: "border-box",
  },
  errorBox: {
    borderRadius: "16px",
    padding: "14px 16px",
    background: "#FFF1F2",
    color: "#BE123C",
    border: "1px solid rgba(244,63,94,0.18)",
    fontWeight: 500,
  },
  successBox: {
    borderRadius: "16px",
    padding: "14px 16px",
    background: "#F0FDF4",
    color: "#15803D",
    border: "1px solid rgba(34,197,94,0.2)",
    fontWeight: 500,
  },
  loadingBox: {
    borderRadius: "16px",
    padding: "18px",
    background: "#F8FAFC",
    color: "#64748B",
    fontWeight: 500,
  },
  emptyBox: {
    borderRadius: "16px",
    padding: "20px",
    background: "#F8FAFC",
    color: "#64748B",
    textAlign: "center",
    fontWeight: 500,
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "640px",
  },
  th: {
    textAlign: "left",
    fontSize: "0.85rem",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#64748B",
    padding: "0 0 14px",
    borderBottom: "1px solid rgba(226,232,240,0.95)",
  },
  td: {
    padding: "16px 0",
    borderBottom: "1px solid rgba(241,245,249,1)",
    color: "#475569",
    fontSize: "0.97rem",
  },
  tdStrong: {
    padding: "16px 0",
    borderBottom: "1px solid rgba(241,245,249,1)",
    color: "#0F172A",
    fontWeight: 700,
    fontSize: "0.98rem",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "88px",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "0.85rem",
    fontWeight: 700,
  },
  statusActive: {
    background: "rgba(34,197,94,0.12)",
    color: "#15803D",
  },
  statusInactive: {
    background: "rgba(148,163,184,0.18)",
    color: "#475569",
  },
  statusVerified: {
    background: "rgba(34,197,94,0.12)",
    color: "#15803D",
  },
  statusPending: {
    background: "rgba(251,191,36,0.18)",
    color: "#B45309",
  },
  actionGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  actionPrimary: {
    border: "none",
    background: "#DCFCE7",
    color: "#166534",
    borderRadius: "10px",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  actionDanger: {
    border: "none",
    background: "#FEE2E2",
    color: "#B91C1C",
    borderRadius: "10px",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  actionSecondary: {
    border: "none",
    background: "#DBEAFE",
    color: "#1D4ED8",
    borderRadius: "10px",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
