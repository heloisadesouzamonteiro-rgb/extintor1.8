import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { generateRTMPdf } from "../utils/generateRTMPdf";
import ConfirmDialog from "./ConfirmDialog";

const PAGE_SIZE = 10;

function matchesSearch(report, search) {
  if (!search) return true;

  const haystack = [
    report.service_order_number,
    report.invoice_number,
    report.report_status,
    report.maintenance_type,
    report.executor_name,
    report.seal_number,
    report.notes,
    report.clients?.name,
    report.extinguishers?.internal_code,
    report.extinguisher_code_snapshot,
    report.serial_number_snapshot,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(search.toLowerCase());
}

export default function RTMList({ onSelect, onEdit, isAdmin = false }) {
  const [companyId, setCompanyId] = useState("");
  const [reports, setReports] = useState([]);
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
    async function fetchReports() {
      if (!companyId) return;

      setLoading(true);
      setErro("");

      const { data, error } = await supabase
        .from("maintenance_reports")
        .select(`
          id,
          company_id,
          client_id,
          extinguisher_id,
          inspection_id,
          technician_id,
          maintenance_date,
          service_order_number,
          invoice_number,
          maintenance_type,
          report_status,
          maintenance_level,
          executor_name,
          seal_number,
          capacity_snapshot,
          agent_snapshot,
          manufacturer_snapshot,
          standard_code_snapshot,
          location_snapshot,
          sector_snapshot,
          manufacture_year_snapshot,
          last_inspection_year,
          gross_weight,
          tare_weight,
          total_weight,
          loss_percentage,
          pressure_value,
          cylinder_volume,
          charge_capacity,
          hydrostatic_test_reference,
          rejection_pin,
          rejection_thread,
          rejection_valve,
          rejection_pressure_gauge,
          rejection_hose,
          rejection_reason,
          extinguisher_type_snapshot,
          notes,
          extinguisher_code_snapshot,
          serial_number_snapshot,
          created_at,
          clients(name),
          extinguishers(internal_code, extinguisher_type, location_description)
        `)
        .eq("company_id", companyId)
        .order("maintenance_date", { ascending: false });

      setLoading(false);

      if (error) {
        setErro("Nao foi possivel carregar os RTMs. " + error.message);
        return;
      }

      setReports(data || []);
    }

    fetchReports();
  }, [companyId]);

  async function handleDeleteReport(reportId) {
    setDeletingId(reportId);
    setErro("");

    const { error } = await supabase.from("maintenance_reports").delete().eq("id", reportId);

    setDeletingId("");

    if (error) {
      setErro("Nao foi possivel excluir o RTM. " + error.message);
      return;
    }

    setReports((prev) => prev.filter((item) => item.id !== reportId));
  }

  const filteredReports = useMemo(() => {
    return reports.filter((report) => matchesSearch(report, appliedSearch));
  }, [reports, appliedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const from = (currentPage - 1) * PAGE_SIZE;
    return filteredReports.slice(from, from + PAGE_SIZE);
  }, [currentPage, filteredReports]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    setAppliedSearch(searchTerm.trim());
    setPage(1);
  }

  function handleClearSearch() {
    setSearchTerm("");
    setAppliedSearch("");
    setPage(1);
  }

  function handleGeneratePdf(report) {
    generateRTMPdf(report);
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>RTM / manutencoes</h2>
        <span style={styles.subtitle}>Historico tecnico de manutencao vinculado aos extintores.</span>
      </div>

      <div style={styles.card}>
        <form style={styles.searchRow} onSubmit={handleSearchSubmit}>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={styles.searchInput}
            placeholder="Pesquisar por cliente, codigo, selo, OS, NF ou executor"
          />
          <button type="submit" style={styles.searchButton}>Pesquisar</button>
          <button type="button" style={styles.clearButton} onClick={handleClearSearch}>Limpar</button>
        </form>

        {erro ? <div style={styles.errorBox}>{erro}</div> : null}
        {loading ? <div style={styles.loadingBox}>Carregando RTMs...</div> : null}
        {!loading && !erro && pageItems.length === 0 ? (
          <div style={styles.emptyState}>Nenhum RTM encontrado para os filtros aplicados.</div>
        ) : null}

        {!loading && !erro
          ? pageItems.map((report) => (
              <div key={report.id} style={styles.item}>
                <div style={styles.info}>
                  <strong style={styles.itemTitle}>
                    {report.extinguisher_code_snapshot || report.extinguishers?.internal_code || "Sem codigo"}
                    {report.report_status ? ` - ${report.report_status}` : ""}
                  </strong>
                  <span style={styles.itemText}>Cliente: {report.clients?.name || "Nao identificado"}</span>
                  <span style={styles.itemText}>
                    {report.extinguishers?.extinguisher_type || "Tipo nao informado"}
                    {report.extinguishers?.location_description ? ` - ${report.extinguishers.location_description}` : ""}
                  </span>
                  <span style={styles.itemMeta}>
                    RTM em {report.maintenance_date ? new Date(report.maintenance_date).toLocaleString("pt-BR") : "Data nao informada"}
                  </span>
                  <span style={styles.itemMeta}>
                    OS: {report.service_order_number || "-"} • NF: {report.invoice_number || "-"} • Selo: {report.seal_number || "-"}
                  </span>
                </div>

                <div style={styles.actions}>
                  <button style={styles.button} onClick={() => handleGeneratePdf(report)}>
                    PDF
                  </button>
                  <button style={styles.buttonSecondary} onClick={() => onEdit && onEdit(report)}>
                    Editar
                  </button>
                  {isAdmin ? (
                    <button
                      style={styles.buttonDanger}
                      onClick={() => setPendingDelete(report)}
                      disabled={deletingId === report.id}
                    >
                      {deletingId === report.id ? "Excluindo..." : "Excluir"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          : null}

        <div style={styles.pagination}>
          <button style={styles.pageButton} disabled={currentPage === 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
            Anterior
          </button>

          <span style={styles.pageInfo}>
            Pagina {currentPage} de {totalPages}
          </span>

          <button style={styles.pageButton} disabled={currentPage === totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
            Proxima
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir RTM"
        message="Deseja realmente excluir este RTM? Esta acao nao pode ser desfeita."
        confirmLabel="Excluir RTM"
        tone="danger"
        loading={deletingId === pendingDelete?.id}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await handleDeleteReport(pendingDelete.id);
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
