import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import {
  RESULT_OPTIONS,
  buildInspectionNotes,
  formatInspectionDateTimeForInput,
  getInspectionFlags,
  initialInspectionForm,
  normalizeInspectionResult,
  parseInspectionNotes,
} from "./inspectionUtils";
import { formatInspectionNumber } from "./inspectionNumberUtils";
import ConfirmDialog from "./ConfirmDialog";

function getFormFromInspection(inspection) {
  if (!inspection) return initialInspectionForm;

  const parsedNotes = parseInspectionNotes(inspection.notes);

  return {
    client_id: inspection.client_id || "",
    extinguisher_id: inspection.extinguisher_id || "",
    tipo_servico: parsedNotes.tipo_servico,
    status_encontrado: parsedNotes.status_encontrado,
    observacoes: parsedNotes.observacoes,
    resultado: normalizeInspectionResult(inspection.result),
    proxima_acao: parsedNotes.proxima_acao,
    inspected_at: formatInspectionDateTimeForInput(inspection.inspected_at),
  };
}

export default function OSFicha({ inspection, onClose, onUpdate }) {
  const [clientes, setClientes] = useState([]);
  const [extintores, setExtintores] = useState([]);
  const [form, setForm] = useState(() => getFormFromInspection(inspection));
  const [loading, setLoading] = useState(false);
  const [loadingExtintores, setLoadingExtintores] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    async function fetchClientes() {
      if (!inspection?.company_id) return;

      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("company_id", inspection.company_id)
        .order("name", { ascending: true });

      if (error) {
        setErro("Nao foi possivel carregar os clientes.");
        return;
      }

      setClientes(data || []);
    }

    fetchClientes();
  }, [inspection?.company_id]);

  useEffect(() => {
    async function fetchExtintores() {
      if (!form.client_id) {
        setExtintores([]);
        return;
      }

      setLoadingExtintores(true);

      const { data, error } = await supabase
        .from("extinguishers")
        .select("id, unit_id, internal_code, extinguisher_type, location_description")
        .eq("client_id", form.client_id)
        .order("created_at", { ascending: false });

      setLoadingExtintores(false);

      if (error) {
        setErro("Nao foi possivel carregar os extintores do cliente.");
        return;
      }

      setExtintores(data || []);
    }

    fetchExtintores();
  }, [form.client_id]);

  const extintorSelecionado = useMemo(() => {
    return extintores.find((item) => item.id === form.extinguisher_id) || null;
  }, [extintores, form.extinguisher_id]);

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === "resultado") {
      setForm((prev) => ({ ...prev, resultado: normalizeInspectionResult(value) }));
    } else if (name === "client_id") {
      setForm((prev) => ({ ...prev, client_id: value, extinguisher_id: "" }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    if (erro) setErro("");
    if (sucesso) setSucesso("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setLoading(true);

    if (!form.client_id) {
      setErro("Selecione o cliente.");
      setLoading(false);
      return;
    }

    if (!form.extinguisher_id) {
      setErro("Selecione o extintor.");
      setLoading(false);
      return;
    }

    const normalizedResult = normalizeInspectionResult(form.resultado.trim());
    if (!normalizedResult) {
      setErro("Informe o resultado da inspecao.");
      setLoading(false);
      return;
    }

    if (!extintorSelecionado?.unit_id) {
      setErro("Esse extintor nao possui unidade vinculada.");
      setLoading(false);
      return;
    }

    const payload = {
      client_id: form.client_id,
      extinguisher_id: form.extinguisher_id,
      unit_id: extintorSelecionado.unit_id,
      result: normalizedResult,
      notes: buildInspectionNotes(form),
      ...getInspectionFlags(normalizedResult),
    };

    const { error } = await supabase
      .from("inspections")
      .update(payload)
      .eq("id", inspection.id);

    setLoading(false);

    if (error) {
      setErro("Nao foi possivel atualizar a OS. " + error.message);
      return;
    }

    setSucesso("OS / inspecao atualizada com sucesso!");

    setTimeout(() => {
      if (onUpdate) onUpdate();
    }, 1000);
  }

  async function handleDeleteInspection() {
    setErro("");
    setSucesso("");
    setLoading(true);

    const { data: linkedReport, error: linkedReportError } = await supabase
      .from("maintenance_reports")
      .select("id, technician_id, executor_name, report_status")
      .eq("inspection_id", inspection.id)
      .limit(1)
      .maybeSingle();

    if (linkedReportError) {
      setLoading(false);
      setErro("Nao foi possivel validar o vinculo da O.S. com RTM. " + linkedReportError.message);
      return;
    }

    if (linkedReport) {
      let technicianName = linkedReport.executor_name || "";

      if (!technicianName && linkedReport.technician_id) {
        const { data: technician } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", linkedReport.technician_id)
          .maybeSingle();

        technicianName = technician?.name || "";
      }

      setLoading(false);
      setErro(
        `Esta O.S. esta vinculada a um RTM ativo${technicianName ? ` do tecnico ${technicianName}` : ""}. Exclua primeiro o RTM relacionado antes de remover a O.S.`,
      );
      return;
    }

    const { error } = await supabase.from("inspections").delete().eq("id", inspection.id);

    setLoading(false);

    if (error) {
      setErro("Nao foi possivel excluir a O.S. " + error.message);
      return;
    }

    setSucesso("O.S. excluida com sucesso!");

    setTimeout(() => {
      if (onUpdate) onUpdate();
    }, 600);
  }

  return (
    <div style={styles.shell}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Ficha da OS / Inspecao</h2>
            <p style={styles.subtitle}>Visualize, pesquise e edite os dados da ordem de servico.</p>
          </div>

          <div style={styles.headerAside}>
            <div style={styles.numberBadge}>
              <span style={styles.numberLabel}>Numero da O.S.</span>
              <strong style={styles.numberValue}>{formatInspectionNumber(inspection?.internal_number)}</strong>
            </div>

            <button
              type="button"
              style={styles.closeTopButton}
              onClick={onClose}
              disabled={loading}
            >
              Fechar
            </button>
          </div>
        </div>

        {(erro || sucesso) && (
          <div
            style={{
              ...styles.feedbackAlert,
              ...(erro ? styles.feedbackError : styles.feedbackSuccess),
            }}
          >
            {erro || sucesso}
          </div>
        )}

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.grid}>
            <div style={{ ...styles.inputGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Cliente</label>
              <select
                name="client_id"
                value={form.client_id}
                onChange={handleChange}
                style={styles.input}
                required
              >
                <option value="">Selecione um cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ ...styles.inputGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Extintor</label>
              <select
                name="extinguisher_id"
                value={form.extinguisher_id}
                onChange={handleChange}
                style={styles.input}
                required
                disabled={!form.client_id || loadingExtintores}
              >
                <option value="">
                  {!form.client_id
                    ? "Selecione um cliente primeiro"
                    : loadingExtintores
                      ? "Carregando extintores..."
                      : "Selecione um extintor"}
                </option>
                {extintores.map((ext) => (
                  <option key={ext.id} value={ext.id}>
                    {ext.internal_code || "Sem codigo"} - {ext.extinguisher_type || "Sem tipo"} - {ext.location_description || "Sem localizacao"}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Data da inspecao</label>
              <input
                type="datetime-local"
                name="inspected_at"
                value={form.inspected_at}
                style={styles.input}
                readOnly
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Resultado</label>
              <select
                name="resultado"
                value={form.resultado}
                onChange={handleChange}
                style={styles.input}
                required
              >
                <option value="">Selecione o resultado</option>
                {RESULT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Tipo de servico</label>
              <input
                name="tipo_servico"
                value={form.tipo_servico}
                onChange={handleChange}
                style={styles.input}
                placeholder="Ex: Verificacao, recarga, manutencao"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Status encontrado</label>
              <input
                name="status_encontrado"
                value={form.status_encontrado}
                onChange={handleChange}
                style={styles.input}
                placeholder="Ex: Ativo, vencido, avariado"
              />
            </div>

            <div style={{ ...styles.inputGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Proxima acao</label>
              <input
                name="proxima_acao"
                value={form.proxima_acao}
                onChange={handleChange}
                style={styles.input}
                placeholder="Ex: Realizar recarga em 30 dias"
              />
            </div>

            <div style={{ ...styles.inputGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Observacoes</label>
              <textarea
                name="observacoes"
                value={form.observacoes}
                onChange={handleChange}
                style={styles.textarea}
                placeholder="Detalhes da inspecao"
              />
            </div>
          </div>

          <div style={styles.btnRow}>
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Salvando..." : "Salvar alteracoes"}
            </button>

            <button
              type="button"
              style={styles.buttonDanger}
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={loading}
            >
              {loading ? "Processando..." : "Excluir O.S."}
            </button>

            <button
              type="button"
              style={styles.buttonSecondary}
              onClick={onClose}
              disabled={loading}
            >
              Fechar
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Excluir O.S."
        message={`Tem certeza que deseja excluir a ${formatInspectionNumber(inspection?.internal_number)}?`}
        confirmLabel="Excluir O.S."
        tone="danger"
        loading={loading}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          await handleDeleteInspection();
          setConfirmDeleteOpen(false);
        }}
      />
    </div>
  );
}

const baseFieldStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #CBD5E1",
  fontSize: "14px",
  background: "#FFFFFF",
  color: "#0F172A",
  outline: "none",
  boxSizing: "border-box",
  WebkitTextFillColor: "#0F172A",
};

const styles = {
  shell: {
    width: "100%",
    fontFamily: "Inter, sans-serif",
  },

  container: {
    background: "#fff",
    borderRadius: "20px",
    boxShadow: "0 15px 40px rgba(0,0,0,0.10)",
    padding: "32px 24px",
    maxWidth: "1000px",
    margin: "0 auto",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    border: "1px solid #E2E8F0",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
  },

  headerAside: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  title: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#0F172A",
    margin: 0,
  },

  subtitle: {
    fontSize: "14px",
    color: "#64748B",
    margin: "8px 0 0 0",
  },

  closeTopButton: {
    padding: "12px 16px",
    border: "none",
    borderRadius: "10px",
    background: "#E2E8F0",
    color: "#0F172A",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },

  numberBadge: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: "150px",
    padding: "12px 14px",
    borderRadius: "14px",
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
  },

  numberLabel: {
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#64748B",
  },

  numberValue: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0F172A",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    width: "100%",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "18px",
    width: "100%",
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: 0,
  },

  label: {
    fontSize: "13px",
    color: "#334155",
    fontWeight: "600",
    marginBottom: "2px",
  },

  input: {
    ...baseFieldStyle,
    minHeight: "48px",
  },

  textarea: {
    ...baseFieldStyle,
    minHeight: "120px",
    resize: "vertical",
    fontFamily: "Inter, sans-serif",
  },

  btnRow: {
    display: "flex",
    gap: "12px",
    marginTop: "10px",
    width: "100%",
  },

  button: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background: "#1DB954",
    color: "white",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "0.2s",
  },

  buttonSecondary: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background: "#E2E8F0",
    color: "#0F172A",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "0.2s",
  },

  buttonDanger: {
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background: "#FEE2E2",
    color: "#B91C1C",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "0.2s",
  },

  feedbackAlert: {
    padding: "14px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "500",
    lineHeight: 1.5,
  },

  feedbackError: {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#B91C1C",
  },

  feedbackSuccess: {
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    color: "#15803D",
  },
};
