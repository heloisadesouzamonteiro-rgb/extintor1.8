import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { formatInspectionNumber } from "./inspectionNumberUtils";
import ConfirmDialog from "./ConfirmDialog";

const PAGE_SIZE = 10;

function matchesSearch(inspection, search) {
  if (!search) return true;

  const haystack = [
    inspection.result,
    inspection.notes,
    inspection.clients?.name,
    inspection.internal_number,
    inspection.extinguishers?.internal_code,
    inspection.extinguishers?.extinguisher_type,
    inspection.extinguishers?.location_description,
    inspection.inspected_at ? new Date(inspection.inspected_at).toLocaleString("pt-BR") : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(search.toLowerCase());
}

export default function OSList({ onSelect, onEdit, isAdmin = false }) {
  const [companyId, setCompanyId] = useState("");
  const [inspections, setInspections] = useState([]);
  const [deletingId, setDeletingId] = useState("");
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    async function bootstrap() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setErro("Usuario nao autenticado.");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", session.user.id)
        .single();

      if (error || !profile?.company_id) {
        setErro("Nao foi possivel identificar a empresa logada.");
        return;
      }

      setCompanyId(profile.company_id);
    }

    bootstrap();
  }, []);

  useEffect(() => {
    async function fetchInspections() {
      if (!companyId) return;

      setLoading(true);
      setErro("");

      const { data, error } = await supabase
        .from("inspections")
        .select(`
          id,
          company_id,
          internal_number,
          client_id,
          extinguisher_id,
          unit_id,
          technician_id,
          inspected_at,
          result,
          notes,
          created_at,
          clients(name),
          extinguishers(internal_code, extinguisher_type, location_description)
        `)
        .eq("company_id", companyId)
        .order("inspected_at", { ascending: false });

      setLoading(false);

      if (error) {
        setErro("Nao foi possivel carregar as OS. " + error.message);
        return;
      }

      const nextInspections = data || [];
      const technicianIds = [...new Set(nextInspections.map((inspection) => inspection.technician_id).filter(Boolean))];

      if (!technicianIds.length) {
        setInspections(nextInspections);
        return;
      }

      const { data: technicianProfiles, error: technicianProfilesError } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", technicianIds);

      if (technicianProfilesError) {
        setErro("Nao foi possivel carregar os tecnicos das OS. " + technicianProfilesError.message);
        setInspections(nextInspections);
        return;
      }

      const technicianMap = new Map((technicianProfiles || []).map((profile) => [profile.id, profile.name || ""]));

      setInspections(
        nextInspections.map((inspection) => ({
          ...inspection,
          technician_name: technicianMap.get(inspection.technician_id) || "",
        })),
      );
    }

    fetchInspections();
  }, [companyId]);

  async function handleDeleteInspection(inspectionId) {
    setDeletingId(inspectionId);
    setErro("");

    const { error: deleteError } = await supabase
      .from("inspections")
      .delete()
      .eq("id", inspectionId);

    setDeletingId("");

    if (deleteError) {
      setErro("Nao foi possivel excluir a O.S. " + deleteError.message);
      return;
    }

    setInspections((prev) => prev.filter((inspection) => inspection.id !== inspectionId));
  }

  const filteredInspections = useMemo(() => {
    return inspections.filter((inspection) => matchesSearch(inspection, appliedSearch));
  }, [inspections, appliedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredInspections.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const from = (currentPage - 1) * PAGE_SIZE;
    return filteredInspections.slice(from, from + PAGE_SIZE);
  }, [currentPage, filteredInspections]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setAppliedSearch(searchTerm.trim());
    setPage(1);
  }

  function handleClearSearch() {
    setSearchTerm("");
    setAppliedSearch("");
    setPage(1);
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>OS / Inspecoes</h2>
        <span style={styles.subtitle}>Pesquise e acompanhe as ordens de servico registradas.</span>
      </div>

      <div style={styles.card}>
        <form style={styles.searchRow} onSubmit={handleSearchSubmit}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
            placeholder="Pesquisar por cliente, extintor, resultado ou observacoes"
          />
          <button type="submit" style={styles.searchButton}>Pesquisar</button>
          <button type="button" style={styles.clearButton} onClick={handleClearSearch}>Limpar</button>
        </form>

        {erro && <div style={styles.errorBox}>{erro}</div>}

        {loading && <div style={styles.loadingBox}>Carregando OS...</div>}

        {!loading && !erro && pageItems.length === 0 && (
          <div style={styles.emptyState}>Nenhuma OS encontrada para os filtros aplicados.</div>
        )}

        {!loading && !erro && pageItems.map((inspection) => (
          <div key={inspection.id} style={styles.item}>
            <div style={styles.info}>
              <strong style={styles.itemTitle}>
                {formatInspectionNumber(inspection.internal_number)} - {inspection.extinguishers?.internal_code || "Sem codigo"} - {inspection.result}
              </strong>
              <span style={styles.itemText}>
                Cliente: {inspection.clients?.name || "Nao identificado"}
              </span>
              <span style={styles.itemText}>
                {inspection.extinguishers?.extinguisher_type || "Tipo nao informado"}
                {inspection.extinguishers?.location_description ? ` - ${inspection.extinguishers.location_description}` : ""}
              </span>
              <span style={styles.itemMeta}>
                Inspecao em {inspection.inspected_at ? new Date(inspection.inspected_at).toLocaleString("pt-BR") : "Data nao informada"}
              </span>
              {isAdmin && inspection.technician_name && (
                <span style={styles.itemMeta}>
                  Tecnico responsavel: {inspection.technician_name}
                </span>
              )}
            </div>

            <div style={styles.actions}>
              <button style={styles.button} onClick={() => onSelect && onSelect(inspection)}>
                Ficha
              </button>
              <button style={styles.buttonSecondary} onClick={() => onEdit && onEdit(inspection)}>
                Editar
              </button>
              {isAdmin && (
                <button
                  style={styles.buttonDanger}
                  onClick={() => setPendingDelete(inspection)}
                  disabled={deletingId === inspection.id}
                >
                  {deletingId === inspection.id ? "Excluindo..." : "Excluir"}
                </button>
              )}
            </div>
          </div>
        ))}

        <div style={styles.pagination}>
          <button
            style={styles.pageButton}
            disabled={currentPage === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Anterior
          </button>

          <span style={styles.pageInfo}>
            Pagina {currentPage} de {totalPages}
          </span>

          <button
            style={styles.pageButton}
            disabled={currentPage === totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Proxima
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir O.S."
        message={`Deseja realmente excluir a ${formatInspectionNumber(pendingDelete?.internal_number)}? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir O.S."
        tone="danger"
        loading={deletingId === pendingDelete?.id}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await handleDeleteInspection(pendingDelete.id);
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

  searchRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  searchInput: {
    flex: 1,
    minWidth: "260px",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #CBD5E1",
    background: "#F8FAFC",
    color: "#0F172A",
    fontSize: "14px",
    boxSizing: "border-box",
  },

  searchButton: {
    padding: "12px 16px",
    borderRadius: "10px",
    border: "none",
    background: "#1DB954",
    color: "#FFFFFF",
    fontWeight: "600",
    cursor: "pointer",
  },

  clearButton: {
    padding: "12px 16px",
    borderRadius: "10px",
    border: "none",
    background: "#E2E8F0",
    color: "#0F172A",
    fontWeight: "600",
    cursor: "pointer",
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
    padding: "16px 0",
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

  buttonDanger: {
    padding: "10px 16px",
    borderRadius: "10px",
    border: "none",
    background: "#FEE2E2",
    color: "#B91C1C",
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
