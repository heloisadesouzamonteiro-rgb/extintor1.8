import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import {
  RESULT_OPTIONS,
  buildInspectionNotes,
  getInspectionFlags,
  initialInspectionForm,
  normalizeInspectionResult,
} from "./inspectionUtils";
import { formatInspectionNumber } from "./inspectionNumberUtils";

function getCurrentInspectionDateTimeInput() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

export default function OSForm({ onSuccess, onCancel }) {
  const [clientes, setClientes] = useState([]);
  const [extintores, setExtintores] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [nextInspectionNumber, setNextInspectionNumber] = useState("");
  const [form, setForm] = useState(initialInspectionForm);
  const [loading, setLoading] = useState(false);
  const [loadingExtintores, setLoadingExtintores] = useState(false);
  const [createdInspectionNumber, setCreatedInspectionNumber] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    async function bootstrap() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setErro("Nao foi possivel carregar a sessao.");
        return;
      }

      if (!session?.user) {
        setErro("Usuario nao autenticado.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, company_id, name")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile?.company_id) {
        setErro("Nao foi possivel identificar a empresa logada.");
        return;
      }

      setCompanyId(profile.company_id);
      setTechnicianId(profile.id);
      setForm((prev) => ({ ...prev, inspected_at: getCurrentInspectionDateTimeInput() }));

      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, name")
        .eq("company_id", profile.company_id)
        .order("name", { ascending: true });

      if (clientsError) {
        setErro("Nao foi possivel carregar os clientes.");
        return;
      }

      setClientes(clientsData || []);
      await loadNextInspectionNumber(profile.company_id);
    }

    bootstrap();
  }, []);

  async function loadNextInspectionNumber(currentCompanyId) {
    if (!currentCompanyId) return;

    const { data, error } = await supabase
      .from("inspections")
      .select("internal_number")
      .eq("company_id", currentCompanyId)
      .order("internal_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return;

    const nextNumber = data?.internal_number ? data.internal_number + 1 : 1001;
    setNextInspectionNumber(formatInspectionNumber(nextNumber));
  }

  useEffect(() => {
    async function fetchExtintores() {
      if (!form.client_id) {
        setExtintores([]);
        setForm((prev) => ({ ...prev, extinguisher_id: "" }));
        return;
      }

      setLoadingExtintores(true);

      const { data, error } = await supabase
        .from("extinguishers")
        .select("id, client_id, unit_id, internal_code, extinguisher_type, location_description")
        .eq("client_id", form.client_id)
        .order("created_at", { ascending: false });

      setLoadingExtintores(false);

      if (error) {
        setExtintores([]);
        setErro("Nao foi possivel carregar os extintores do cliente.");
        return;
      }

      setExtintores(data || []);
      setForm((prev) => ({ ...prev, extinguisher_id: prev.client_id === form.client_id ? prev.extinguisher_id : "" }));
    }

    fetchExtintores();
  }, [form.client_id]);

  const extintorSelecionado = useMemo(() => {
    return extintores.find((item) => item.id === form.extinguisher_id) || null;
  }, [extintores, form.extinguisher_id]);

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === "resultado") {
      const normalizedValue = normalizeInspectionResult(value);
      setForm((prev) => ({ ...prev, resultado: normalizedValue }));
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
    setCreatedInspectionNumber("");
    setLoading(true);

    if (!companyId) {
      setErro("Nao foi possivel identificar a empresa logada.");
      setLoading(false);
      return;
    }

    if (!technicianId) {
      setErro("Nao foi possivel identificar o tecnico logado.");
      setLoading(false);
      return;
    }

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

    if (!extintorSelecionado?.unit_id) {
      setErro("Esse extintor nao possui unidade vinculada. Para registrar a inspecao, ele precisa ter uma unidade.");
      setLoading(false);
      return;
    }

    const normalizedResult = normalizeInspectionResult(form.resultado.trim());

    if (!normalizedResult) {
      setErro("Informe o resultado da inspecao.");
      setLoading(false);
      return;
    }

    const payload = {
      company_id: companyId,
      technician_id: technicianId,
      client_id: form.client_id,
      extinguisher_id: form.extinguisher_id,
      unit_id: extintorSelecionado.unit_id,
      inspected_at: new Date().toISOString(),
      result: normalizedResult,
      notes: buildInspectionNotes(form),
      ...getInspectionFlags(normalizedResult),
    };

    const { data, error } = await supabase
      .from("inspections")
      .insert([payload])
      .select("internal_number")
      .single();

    setLoading(false);

    if (error) {
      setErro("Nao foi possivel cadastrar a inspecao. " + error.message);
      return;
    }

    setCreatedInspectionNumber(data?.internal_number ? formatInspectionNumber(data.internal_number) : "");
    setSucesso(
      data?.internal_number
        ? `OS / inspecao cadastrada com sucesso! Numero gerado: ${formatInspectionNumber(data.internal_number)}.`
        : "OS / inspecao cadastrada com sucesso!",
    );
    setForm({ ...initialInspectionForm, inspected_at: getCurrentInspectionDateTimeInput() });
    setExtintores([]);
    await loadNextInspectionNumber(companyId);

    setTimeout(() => {
      if (onSuccess) onSuccess();
    }, 1200);
  }

  return (
    <div style={styles.shell}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.headerAside}>
            <div style={styles.numberBadge}>
              <span style={styles.numberLabel}>Numero da O.S.</span>
              <strong style={styles.numberValue}>{createdInspectionNumber || nextInspectionNumber || "Nº 1001"}</strong>
            </div>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={styles.closeButton}
                disabled={loading}
              >
                Fechar
              </button>
            )}
          </div>
        </div>

        {(erro || sucesso) && (
          <div
            style={{
              ...styles.alert,
              ...(erro ? styles.alertError : styles.alertSuccess),
            }}
          >
            {erro || sucesso}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.grid}>
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
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

            <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
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

            <div style={styles.field}>
              <label style={styles.label}>Data da inspecao</label>
              <input
                type="datetime-local"
                name="inspected_at"
                value={form.inspected_at}
                style={styles.input}
                readOnly
              />
            </div>

            <div style={styles.field}>
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

            <div style={styles.field}>
              <label style={styles.label}>Tipo de servico</label>
              <input
                name="tipo_servico"
                value={form.tipo_servico}
                onChange={handleChange}
                style={styles.input}
                placeholder="Ex: Verificacao, recarga, manutencao"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Status encontrado</label>
              <input
                name="status_encontrado"
                value={form.status_encontrado}
                onChange={handleChange}
                style={styles.input}
                placeholder="Ex: Ativo, vencido, avariado"
              />
            </div>

            <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Proxima acao</label>
              <input
                name="proxima_acao"
                value={form.proxima_acao}
                onChange={handleChange}
                style={styles.input}
                placeholder="Ex: Realizar recarga em 30 dias"
              />
            </div>

            <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
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

          <div style={styles.actions}>
            <button type="submit" style={styles.primaryButton} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const baseInput = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 14px",
  borderRadius: "12px",
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#0F172A",
  fontSize: "14px",
  outline: "none",
  boxShadow: "none",
  appearance: "none",
  WebkitTextFillColor: "#0F172A",
};

const styles = {
  shell: {
    width: "100%",
    padding: 0,
    margin: 0,
    fontFamily: "Inter, sans-serif",
  },

  card: {
    width: "100%",
    background: "#FFFFFF",
    borderRadius: "20px",
    padding: "28px",
    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
    border: "1px solid #E2E8F0",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  headerAside: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
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

  title: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "700",
    color: "#0F172A",
  },

  subtitle: {
    margin: "8px 0 0 0",
    fontSize: "14px",
    color: "#64748B",
    lineHeight: 1.5,
  },

  closeButton: {
    border: "none",
    background: "#F1F5F9",
    color: "#0F172A",
    padding: "11px 16px",
    borderRadius: "12px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  alert: {
    marginBottom: "18px",
    padding: "14px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "500",
  },

  alertError: {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#B91C1C",
  },

  alertSuccess: {
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    color: "#15803D",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "18px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minWidth: 0,
  },

  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
  },

  input: {
    ...baseInput,
    minHeight: "48px",
  },

  textarea: {
    ...baseInput,
    minHeight: "130px",
    resize: "vertical",
    fontFamily: "Inter, sans-serif",
  },

  actions: {
    display: "flex",
    gap: "12px",
    marginTop: "22px",
  },

  primaryButton: {
    flex: 1,
    border: "none",
    background: "#22C55E",
    color: "#FFFFFF",
    padding: "14px 18px",
    borderRadius: "12px",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
  },

  secondaryButton: {
    flex: 1,
    border: "none",
    background: "#E2E8F0",
    color: "#0F172A",
    padding: "14px 18px",
    borderRadius: "12px",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
  },
};
