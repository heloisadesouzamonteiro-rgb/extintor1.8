import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import {
  buildMaintenanceReportPayload,
  MAINTENANCE_STATUS_OPTIONS,
  MAINTENANCE_TYPE_OPTIONS,
  mapMaintenanceReportToForm,
  prefillMaintenanceFormFromExtinguisher,
} from "./maintenanceReportFields";
import { formatInspectionNumber } from "./inspectionNumberUtils";
import ConfirmDialog from "./ConfirmDialog";

const EXTINGUISHER_SELECT_FIELDS = [
  "id",
  "client_id",
  "unit_id",
  "internal_code",
  "serial_number",
  "extinguisher_type",
  "capacity",
  "agent",
  "manufacturer",
  "standard_code",
  "location_description",
  "sector",
  "manufacture_year",
  "last_inspection_year",
  "maintenance_level",
  "gross_weight",
  "tare_weight",
  "total_weight",
  "loss_percentage",
  "pressure_value",
  "cylinder_volume",
  "charge_capacity",
  "hydrostatic_test_reference",
  "rejection_pin",
  "rejection_thread",
  "rejection_valve",
  "rejection_pressure_gauge",
  "rejection_hose",
  "rejection_reason",
  "maintenance_executor",
  "seal_number",
].join(", ");

export default function RTMFicha({ report, onClose, onUpdate }) {
  const [companyId, setCompanyId] = useState(report?.company_id || "");
  const [technicianId, setTechnicianId] = useState(report?.technician_id || "");
  const [clients, setClients] = useState([]);
  const [extinguishers, setExtinguishers] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loadingExtinguishers, setLoadingExtinguishers] = useState(false);
  const [loadingInspections, setLoadingInspections] = useState(false);
  const [form, setForm] = useState(() => mapMaintenanceReportToForm(report));
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    setForm(mapMaintenanceReportToForm(report));
    setCompanyId(report?.company_id || "");
    setTechnicianId(report?.technician_id || "");
  }, [report]);

  useEffect(() => {
    async function fetchClients() {
      if (!companyId) return;

      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      if (error) {
        setErro("Nao foi possivel carregar os clientes.");
        return;
      }

      setClients(data || []);
    }

    fetchClients();
  }, [companyId]);

  useEffect(() => {
    async function fetchExtinguishers() {
      if (!form.client_id) {
        setExtinguishers([]);
        setInspections([]);
        return;
      }

      setLoadingExtinguishers(true);

      const { data, error } = await supabase
        .from("extinguishers")
        .select(EXTINGUISHER_SELECT_FIELDS)
        .eq("client_id", form.client_id)
        .order("created_at", { ascending: false });

      setLoadingExtinguishers(false);

      if (error) {
        setErro("Nao foi possivel carregar os extintores do cliente.");
        return;
      }

      setExtinguishers(data || []);
    }

    fetchExtinguishers();
  }, [form.client_id]);

  useEffect(() => {
    async function fetchInspections() {
      if (!form.extinguisher_id) {
        setInspections([]);
        return;
      }

      setLoadingInspections(true);

      const { data, error } = await supabase
        .from("inspections")
        .select("id, internal_number, inspected_at, result")
        .eq("extinguisher_id", form.extinguisher_id)
        .order("inspected_at", { ascending: false });

      setLoadingInspections(false);

      if (error) {
        setErro("Nao foi possivel carregar as OS do extintor.");
        return;
      }

      setInspections(data || []);
    }

    fetchInspections();
  }, [form.extinguisher_id]);

  const selectedExtinguisher = useMemo(() => {
    return extinguishers.find((item) => item.id === form.extinguisher_id) || null;
  }, [extinguishers, form.extinguisher_id]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;

    setForm((prev) => {
      let nextForm = { ...prev, [name]: nextValue };
      if (name === "client_id") {
        nextForm = { ...nextForm, extinguisher_id: "", inspection_id: "" };
      }
      if (name === "extinguisher_id") {
        nextForm = prefillMaintenanceFormFromExtinguisher(
          extinguishers.find((item) => item.id === value) || null,
          { ...nextForm, inspection_id: "" },
        );
      }
      if (name === "inspection_id") {
        const selectedInspection = inspections.find((item) => item.id === value);
        nextForm.service_order_number = selectedInspection?.internal_number
          ? formatInspectionNumber(selectedInspection.internal_number)
          : "";
      }
      return nextForm;
    });

    if (erro) setErro("");
    if (sucesso) setSucesso("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
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

    if (!selectedExtinguisher) {
      setErro("Nao foi possivel carregar os dados do extintor selecionado.");
      setLoading(false);
      return;
    }

    const payload = buildMaintenanceReportPayload({
      form,
      companyId,
      technicianId,
      selectedExtinguisher,
    });

    const { error } = await supabase.from("maintenance_reports").update(payload).eq("id", report.id);

    setLoading(false);

    if (error) {
      setErro("Nao foi possivel atualizar o RTM. " + error.message);
      return;
    }

    setSucesso("RTM atualizado com sucesso!");

    setTimeout(() => {
      if (onUpdate) onUpdate();
    }, 1000);
  }

  async function handleDeleteReport() {
    setErro("");
    setSucesso("");
    setLoading(true);

    const { error } = await supabase.from("maintenance_reports").delete().eq("id", report.id);

    setLoading(false);

    if (error) {
      setErro("Nao foi possivel excluir o RTM. " + error.message);
      return;
    }

    setSucesso("RTM excluido com sucesso!");

    setTimeout(() => {
      if (onUpdate) onUpdate();
    }, 600);
  }

  return (
    <div style={styles.shell}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Ficha do RTM</h2>
            <p style={styles.subtitle}>Edite o historico tecnico da manutencao sem alterar o cadastro base do extintor.</p>
          </div>

          <button type="button" style={styles.closeTopButton} onClick={onClose} disabled={loading}>
            Fechar
          </button>
        </div>

        {erro || sucesso ? (
          <div style={{ ...styles.feedbackAlert, ...(erro ? styles.feedbackError : styles.feedbackSuccess) }}>{erro || sucesso}</div>
        ) : null}

        <form style={styles.form} onSubmit={handleSubmit}>
          <Section title="Vinculo do RTM">
            <div style={styles.grid}>
              <Field label="Cliente" fullWidth>
                <select name="client_id" value={form.client_id} onChange={handleChange} style={styles.input} required>
                  <option value="">Selecione um cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Extintor" fullWidth>
                <select
                  name="extinguisher_id"
                  value={form.extinguisher_id}
                  onChange={handleChange}
                  style={styles.input}
                  required
                  disabled={!form.client_id || loadingExtinguishers}
                >
                  <option value="">
                    {!form.client_id ? "Selecione um cliente primeiro" : loadingExtinguishers ? "Carregando extintores..." : "Selecione um extintor"}
                  </option>
                  {extinguishers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.internal_code || "Sem codigo"} - {item.extinguisher_type || "Sem tipo"} - {item.location_description || "Sem localizacao"}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="O.S. vinculada">
                <select
                  name="inspection_id"
                  value={form.inspection_id}
                  onChange={handleChange}
                  style={styles.input}
                  disabled={!form.extinguisher_id || loadingInspections}
                >
                  <option value="">
                    {!form.extinguisher_id ? "Selecione um extintor primeiro" : loadingInspections ? "Carregando OS..." : "Sem vinculacao"}
                  </option>
                  {inspections.map((inspection) => (
                    <option key={inspection.id} value={inspection.id}>
                      {formatInspectionNumber(inspection.internal_number)} - {new Date(inspection.inspected_at).toLocaleString("pt-BR")} - {inspection.result || "Sem resultado"}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Data do RTM">
                <input type="datetime-local" name="maintenance_date" value={form.maintenance_date} onChange={handleChange} style={styles.input} required />
              </Field>

              <Field label="Numero da O.S.">
                <input name="service_order_number" value={form.service_order_number} onChange={handleChange} style={styles.input} />
              </Field>

              <Field label="NF">
                <input name="invoice_number" value={form.invoice_number} onChange={handleChange} style={styles.input} />
              </Field>

              <Field label="Tipo de manutencao">
                <select name="maintenance_type" value={form.maintenance_type} onChange={handleChange} style={styles.input}>
                  <option value="">Selecione</option>
                  {MAINTENANCE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Field>

              <Field label="Status do RTM">
                <select name="report_status" value={form.report_status} onChange={handleChange} style={styles.input}>
                  <option value="">Selecione</option>
                  {MAINTENANCE_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Responsavel e rastreabilidade">
            <div style={styles.grid}>
              <Field label="Executor da manutencao">
                <input name="executor_name" value={form.executor_name} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Selo">
                <input name="seal_number" value={form.seal_number} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Nivel de manutencao">
                <input type="number" name="maintenance_level" value={form.maintenance_level} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Ano de fabricacao">
                <input type="number" name="manufacture_year_snapshot" value={form.manufacture_year_snapshot} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Ultimo ensaio / ultima inspecao">
                <input type="number" name="last_inspection_year" value={form.last_inspection_year} onChange={handleChange} style={styles.input} />
              </Field>
            </div>
          </Section>

          <Section title="Dados tecnicos do RTM">
            <div style={styles.grid}>
              <Field label="Peso bruto">
                <input type="number" step="0.01" name="gross_weight" value={form.gross_weight} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Peso tara">
                <input type="number" step="0.01" name="tare_weight" value={form.tare_weight} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Peso total">
                <input type="number" step="0.01" name="total_weight" value={form.total_weight} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Perda percentual">
                <input type="number" step="0.01" name="loss_percentage" value={form.loss_percentage} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Pressao">
                <input type="number" step="0.01" name="pressure_value" value={form.pressure_value} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Volume">
                <input type="number" step="0.01" name="cylinder_volume" value={form.cylinder_volume} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Capacidade de carga">
                <input name="charge_capacity" value={form.charge_capacity} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Referencia do ensaio hidrostatico">
                <input name="hydrostatic_test_reference" value={form.hydrostatic_test_reference} onChange={handleChange} style={styles.input} />
              </Field>
            </div>
          </Section>

          <Section title="Reprovacoes">
            <div style={styles.checkboxGrid}>
              <Checkbox label="Pinos" name="rejection_pin" checked={form.rejection_pin} onChange={handleChange} />
              <Checkbox label="Rosca" name="rejection_thread" checked={form.rejection_thread} onChange={handleChange} />
              <Checkbox label="Valvula" name="rejection_valve" checked={form.rejection_valve} onChange={handleChange} />
              <Checkbox label="Indicador de pressao" name="rejection_pressure_gauge" checked={form.rejection_pressure_gauge} onChange={handleChange} />
              <Checkbox label="Mangueira" name="rejection_hose" checked={form.rejection_hose} onChange={handleChange} />
            </div>

            <div style={styles.grid}>
              <Field label="Motivo da reprovacao" fullWidth>
                <textarea name="rejection_reason" value={form.rejection_reason} onChange={handleChange} style={styles.textarea} />
              </Field>
              <Field label="Observacoes do RTM" fullWidth>
                <textarea name="notes" value={form.notes} onChange={handleChange} style={styles.textarea} />
              </Field>
            </div>
          </Section>

          <div style={styles.btnRow}>
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Salvando..." : "Salvar alteracoes"}
            </button>

            <button type="button" style={styles.buttonDanger} onClick={() => setConfirmDeleteOpen(true)} disabled={loading}>
              {loading ? "Processando..." : "Excluir RTM"}
            </button>

            <button type="button" style={styles.buttonSecondary} onClick={onClose} disabled={loading}>
              Fechar
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Excluir RTM"
        message="Tem certeza que deseja excluir este RTM?"
        confirmLabel="Excluir RTM"
        tone="danger"
        loading={loading}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          await handleDeleteReport();
          setConfirmDeleteOpen(false);
        }}
      />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children, fullWidth = false }) {
  return (
    <div style={{ ...styles.inputGroup, ...(fullWidth ? styles.fullWidth : null) }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

function Checkbox({ label, name, checked, onChange }) {
  return (
    <label style={styles.checkboxLabel}>
      <input type="checkbox" name={name} checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
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
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    width: "100%",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    paddingTop: "18px",
    borderTop: "1px solid #E2E8F0",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#0F172A",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "18px",
    width: "100%",
  },
  checkboxGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: 0,
  },
  fullWidth: {
    gridColumn: "1 / -1",
  },
  label: {
    fontSize: "13px",
    color: "#334155",
    fontWeight: "600",
    marginBottom: "2px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #CBD5E1",
    background: "#F8FAFC",
    color: "#0F172A",
    fontSize: "14px",
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
