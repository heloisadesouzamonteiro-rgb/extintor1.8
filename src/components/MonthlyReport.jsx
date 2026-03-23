import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import { parseInspectionNotes } from "./inspectionUtils";

function getCurrentMonthValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthRange(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);
  return { start, end };
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function formatMonthLabel(monthValue) {
  if (!monthValue) return "";
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function MonthlyReport() {
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("ExtintorIA");
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function bootstrap() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setError("Usuario nao autenticado.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile?.company_id) {
        setError("Nao foi possivel identificar a empresa logada.");
        return;
      }

      setCompanyId(profile.company_id);

      const [{ data: clientsData, error: clientsError }, { data: companyData }] = await Promise.all([
        supabase.from("clients").select("id, name").eq("company_id", profile.company_id).order("name", { ascending: true }),
        supabase.from("companies").select("name").eq("id", profile.company_id).maybeSingle(),
      ]);

      if (clientsError) {
        setError("Nao foi possivel carregar os clientes.");
        return;
      }

      setClients(clientsData || []);
      if (companyData?.name) {
        setCompanyName(companyData.name);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    async function fetchReportData() {
      if (!companyId || !selectedMonth) return;

      setLoading(true);
      setError("");

      const { start, end } = getMonthRange(selectedMonth);
      let query = supabase
        .from("inspections")
        .select(`
          id,
          inspected_at,
          result,
          notes,
          requires_maintenance,
          requires_recharge,
          requires_replacement,
          clients(name, document),
          units(name),
          extinguishers(internal_code, extinguisher_type, capacity, location_description, sector, status)
        `)
        .eq("company_id", companyId)
        .gte("inspected_at", start.toISOString())
        .lt("inspected_at", end.toISOString())
        .order("inspected_at", { ascending: false });

      if (selectedClientId) {
        query = query.eq("client_id", selectedClientId);
      }

      const { data, error: fetchError } = await query;

      setLoading(false);

      if (fetchError) {
        setError("Nao foi possivel carregar o relatorio mensal. " + fetchError.message);
        return;
      }

      setInspections(data || []);
    }

    fetchReportData();
  }, [companyId, selectedClientId, selectedMonth]);

  const reportItems = useMemo(() => {
    return inspections.map((inspection) => {
      const parsedNotes = parseInspectionNotes(inspection.notes);
      return {
        id: inspection.id,
        inspected_at: inspection.inspected_at,
        result: inspection.result || "-",
        client_name: inspection.clients?.name || "Cliente nao identificado",
        client_document: inspection.clients?.document || "-",
        unit_name: inspection.units?.name || "Sem unidade",
        extinguisher_code: inspection.extinguishers?.internal_code || "Sem codigo",
        extinguisher_type: inspection.extinguishers?.extinguisher_type || "Sem tipo",
        capacity: inspection.extinguishers?.capacity || "-",
        location: inspection.extinguishers?.location_description || "-",
        sector: inspection.extinguishers?.sector || "-",
        extinguisher_status: inspection.extinguishers?.status || "-",
        tipo_servico: parsedNotes.tipo_servico || "-",
        status_encontrado: parsedNotes.status_encontrado || "-",
        proxima_acao: parsedNotes.proxima_acao || "-",
        observacoes: parsedNotes.observacoes || "-",
        requires_maintenance: inspection.requires_maintenance,
        requires_recharge: inspection.requires_recharge,
        requires_replacement: inspection.requires_replacement,
      };
    });
  }, [inspections]);

  const summary = useMemo(() => {
    return {
      total: reportItems.length,
      aprovado: reportItems.filter((item) => item.result === "APROVADO").length,
      reprovado: reportItems.filter((item) => item.result === "REPROVADO").length,
      manutencao: reportItems.filter((item) => item.result === "MANUTENCAO").length,
      recarga: reportItems.filter((item) => item.result === "RECARGA").length,
      substituicao: reportItems.filter((item) => item.result === "SUBSTITUICAO").length,
    };
  }, [reportItems]);

  const groupedByClient = useMemo(() => {
    const map = new Map();

    for (const item of reportItems) {
      const key = item.client_name;
      if (!map.has(key)) {
        map.set(key, { client_name: key, total: 0, aprovados: 0, pendencias: 0 });
      }

      const entry = map.get(key);
      entry.total += 1;
      if (item.result === "APROVADO") {
        entry.aprovados += 1;
      }
      if (["REPROVADO", "MANUTENCAO", "RECARGA", "SUBSTITUICAO"].includes(item.result)) {
        entry.pendencias += 1;
      }
    }

    return Array.from(map.values());
  }, [reportItems]);

  function handlePrintPdf() {
    if (!reportItems.length) return;

    const summaryCards = [
      ["Inspecoes no mes", summary.total],
      ["Aprovados", summary.aprovado],
      ["Reprovados", summary.reprovado],
      ["Manutencao", summary.manutencao],
      ["Recarga", summary.recarga],
      ["Substituicao", summary.substituicao],
    ]
      .map(([label, value]) => `<div class="card"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`)
      .join("");

    const clientRows = groupedByClient
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.client_name)}</td>
            <td>${escapeHtml(item.total)}</td>
            <td>${escapeHtml(item.aprovados)}</td>
            <td>${escapeHtml(item.pendencias)}</td>
          </tr>
        `,
      )
      .join("");

    const detailRows = reportItems
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(formatDateTime(item.inspected_at))}</td>
            <td>${escapeHtml(item.client_name)}</td>
            <td>${escapeHtml(item.unit_name)}</td>
            <td>${escapeHtml(item.extinguisher_code)}</td>
            <td>${escapeHtml(item.extinguisher_type)}</td>
            <td>${escapeHtml(item.capacity)}</td>
            <td>${escapeHtml(item.location)}</td>
            <td>${escapeHtml(item.result)}</td>
            <td>${escapeHtml(item.tipo_servico)}</td>
            <td>${escapeHtml(item.status_encontrado)}</td>
            <td>${escapeHtml(item.proxima_acao)}</td>
            <td>${escapeHtml(item.observacoes)}</td>
          </tr>
        `,
      )
      .join("");

    const printWindow = window.open("", "_blank", "width=1280,height=900");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatorio mensal de extintores</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1, h2 { margin: 0 0 8px; }
            .muted { color: #64748b; margin-bottom: 18px; }
            .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0 28px; }
            .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; background: #f8fafc; }
            .label { font-size: 12px; color: #64748b; margin-bottom: 4px; }
            .value { font-size: 22px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; vertical-align: top; }
            th { background: #e2e8f0; }
            .section { margin-top: 28px; }
            @media print {
              body { padding: 0; }
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          <h1>Relatorio mensal de extintores</h1>
          <div class="muted">Empresa: ${escapeHtml(companyName)} | Competencia: ${escapeHtml(formatMonthLabel(selectedMonth))}</div>
          <div class="cards">${summaryCards}</div>

          <div class="section">
            <h2>Resumo por cliente</h2>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Aprovados</th>
                  <th>Pendencias</th>
                </tr>
              </thead>
              <tbody>${clientRows || '<tr><td colspan="4">Sem dados no periodo.</td></tr>'}</tbody>
            </table>
          </div>

          <div class="section page-break">
            <h2>Detalhamento das inspecoes</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Unidade</th>
                  <th>Codigo</th>
                  <th>Tipo</th>
                  <th>Cap.</th>
                  <th>Localizacao</th>
                  <th>Resultado</th>
                  <th>Servico</th>
                  <th>Status encontrado</th>
                  <th>Proxima acao</th>
                  <th>Observacoes</th>
                </tr>
              </thead>
              <tbody>${detailRows}</tbody>
            </table>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>Relatorio mensal</h2>
        <span style={styles.subtitle}>
          Adaptado ao sistema atual para consolidar inspecoes e gerar PDF no fim do mes.
        </span>
      </div>

      <div style={styles.card}>
        <div style={styles.filters}>
          <div style={styles.field}>
            <label style={styles.label}>Competencia</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Cliente</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              style={styles.input}
            >
              <option value="">Todos os clientes</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={handlePrintPdf}
              disabled={!reportItems.length}
            >
              Gerar PDF
            </button>
          </div>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}
        {loading && <div style={styles.loadingBox}>Carregando relatorio...</div>}

        {!loading && !error && (
          <>
            <div style={styles.summaryGrid}>
              <SummaryCard label="Inspecoes no mes" value={summary.total} />
              <SummaryCard label="Aprovados" value={summary.aprovado} />
              <SummaryCard label="Reprovados" value={summary.reprovado} />
              <SummaryCard label="Manutencao" value={summary.manutencao} />
              <SummaryCard label="Recarga" value={summary.recarga} />
              <SummaryCard label="Substituicao" value={summary.substituicao} />
            </div>

            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Resumo por cliente</h3>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Cliente</th>
                      <th style={styles.th}>Total</th>
                      <th style={styles.th}>Aprovados</th>
                      <th style={styles.th}>Pendencias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedByClient.length === 0 ? (
                      <tr>
                        <td style={styles.td} colSpan={4}>Sem dados no periodo.</td>
                      </tr>
                    ) : (
                      groupedByClient.map((item) => (
                        <tr key={item.client_name}>
                          <td style={styles.td}>{item.client_name}</td>
                          <td style={styles.td}>{item.total}</td>
                          <td style={styles.td}>{item.aprovados}</td>
                          <td style={styles.td}>{item.pendencias}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>Detalhamento das inspecoes</h3>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Data</th>
                      <th style={styles.th}>Cliente</th>
                      <th style={styles.th}>Unidade</th>
                      <th style={styles.th}>Codigo</th>
                      <th style={styles.th}>Tipo</th>
                      <th style={styles.th}>Cap.</th>
                      <th style={styles.th}>Localizacao</th>
                      <th style={styles.th}>Resultado</th>
                      <th style={styles.th}>Servico</th>
                      <th style={styles.th}>Status encontrado</th>
                      <th style={styles.th}>Proxima acao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportItems.length === 0 ? (
                      <tr>
                        <td style={styles.td} colSpan={11}>Nenhuma inspecao encontrada para os filtros selecionados.</td>
                      </tr>
                    ) : (
                      reportItems.map((item) => (
                        <tr key={item.id}>
                          <td style={styles.td}>{formatDateTime(item.inspected_at)}</td>
                          <td style={styles.td}>{item.client_name}</td>
                          <td style={styles.td}>{item.unit_name}</td>
                          <td style={styles.td}>{item.extinguisher_code}</td>
                          <td style={styles.td}>{item.extinguisher_type}</td>
                          <td style={styles.td}>{item.capacity}</td>
                          <td style={styles.td}>{item.location}</td>
                          <td style={styles.td}>{item.result}</td>
                          <td style={styles.td}>{item.tipo_servico}</td>
                          <td style={styles.td}>{item.status_encontrado}</td>
                          <td style={styles.td}>{item.proxima_acao}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
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
    gap: "20px",
  },
  filters: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "16px",
    alignItems: "end",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #CBD5E1",
    background: "#F8FAFC",
    color: "#0F172A",
    fontSize: "14px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
  },
  primaryButton: {
    border: "none",
    background: "#1DB954",
    color: "#FFFFFF",
    padding: "12px 18px",
    borderRadius: "10px",
    fontWeight: "700",
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
    color: "#64748B",
    fontSize: "14px",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
  },
  summaryCard: {
    border: "1px solid #E2E8F0",
    borderRadius: "14px",
    padding: "16px",
    background: "#F8FAFC",
  },
  summaryLabel: {
    color: "#64748B",
    fontSize: "13px",
    marginBottom: "6px",
  },
  summaryValue: {
    color: "#0F172A",
    fontSize: "28px",
    fontWeight: "700",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#0F172A",
    margin: 0,
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #E2E8F0",
    borderRadius: "14px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1100px",
  },
  th: {
    background: "#E2E8F0",
    color: "#0F172A",
    fontSize: "12px",
    fontWeight: "700",
    padding: "10px",
    textAlign: "left",
    borderBottom: "1px solid #CBD5E1",
  },
  td: {
    padding: "10px",
    fontSize: "12px",
    color: "#334155",
    borderBottom: "1px solid #E2E8F0",
    verticalAlign: "top",
  },
};
