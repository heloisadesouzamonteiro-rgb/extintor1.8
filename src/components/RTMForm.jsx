import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import {
  buildMaintenanceReportPayload,
  initialMaintenanceReportForm,
  MAINTENANCE_STATUS_OPTIONS,
  MAINTENANCE_TYPE_OPTIONS,
  prefillMaintenanceFormFromExtinguisher,
} from "./maintenanceReportFields";
import { formatInspectionNumber } from "./inspectionNumberUtils";

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

export default function RTMForm({ onSuccess, onCancel }) {
  const [companyId, setCompanyId] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [clients, setClients] = useState([]);
  const [extinguishers, setExtinguishers] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loadingExtinguishers, setLoadingExtinguishers] = useState(false);
  const [loadingInspections, setLoadingInspections] = useState(false);
  const [form, setForm] = useState(initialMaintenanceReportForm);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    async function bootstrap() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setErro("Usuario nao autenticado.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, company_id")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile?.company_id) {
        setErro("Nao foi possivel identificar a empresa logada.");
        return;
      }

      setCompanyId(profile.company_id);
      setTechnicianId(profile.id);

      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, name")
        .eq("company_id", profile.company_id)
        .order("name", { ascending: true });

      if (clientsError) {
        setErro("Nao foi possivel carregar os clientes.");
        return;
      }

      setClients(clientsData || []);
    }

    bootstrap();
  }, []);

  useEffect(() => {
    async function fetchExtinguishers() {
      if (!form.client_id) {
        setExtinguishers([]);
        setInspections([]);
        setForm((prev) => ({ ...prev, extinguisher_id: "", inspection_id: "" }));
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
        setExtinguishers([]);
        return;
      }

      setExtinguishers(data || []);
      setForm((prev) => ({ ...prev, extinguisher_id: "", inspection_id: "" }));
      setInspections([]);
    }

    fetchExtinguishers();
  }, [form.client_id]);

  useEffect(() => {
    async function fetchInspections() {
      if (!form.extinguisher_id) {
        setInspections([]);
        setForm((prev) => ({ ...prev, inspection_id: "" }));
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
        setInspections([]);
        return;
      }

      setInspections(data || []);
      setForm((prev) => ({ ...prev, inspection_id: "" }));
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

    if (!companyId) {
      setErro("Nao foi possivel identificar a empresa logada.");
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

    const { error } = await supabase.from("maintenance_reports").insert([payload]);

    setLoading(false);

    if (error) {
      setErro("Nao foi possivel salvar o RTM. " + error.message);
      return;
    }

    setSucesso("RTM cadastrado com sucesso!");
    setForm(initialMaintenanceReportForm);
    setExtinguishers([]);
    setInspections([]);

    setTimeout(() => {
      if (onSuccess) onSuccess();
    }, 1200);
  }

  return (
    <div style={styles.shell}>
      <div style={styles.card}>
        <div style={styles.header}>
          {onCancel ? (
            <button type="button" onClick={onCancel} style={styles.closeButton} disabled={loading}>
              Fechar
            </button>
          ) : null}
        </div>

        {erro || sucesso ? (
          <div style={{ ...styles.alert, ...(erro ? styles.alertError : styles.alertSuccess) }}>{erro || sucesso}</div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <Section title="Vinculo do RTM" description="Cliente, extintor e O.S. opcional relacionada.">
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
                    {!form.client_id
                      ? "Selecione um cliente primeiro"
                      : loadingExtinguishers
                        ? "Carregando extintores..."
                        : "Selecione um extintor"}
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
                    {!form.extinguisher_id
                      ? "Selecione um extintor primeiro"
                      : loadingInspections
                        ? "Carregando OS..."
                        : "Sem vinculacao"}
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
                <input name="service_order_number" value={form.service_order_number} onChange={handleChange} style={styles.input} placeholder="Ex: OS-2026-014" />
              </Field>

              <Field label="NF">
                <input name="invoice_number" value={form.invoice_number} onChange={handleChange} style={styles.input} placeholder="Ex: NF-1048" />
              </Field>

              <Field label="Tipo de manutencao">
                <select name="maintenance_type" value={form.maintenance_type} onChange={handleChange} style={styles.input}>
                  <option value="">Selecione</option>
                  {MAINTENANCE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Status do RTM">
                <select name="report_status" value={form.report_status} onChange={handleChange} style={styles.input}>
                  <option value="">Selecione</option>
                  {MAINTENANCE_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {selectedExtinguisher ? (
            <Section title="Snapshot do extintor" description="Resumo do equipamento vinculado neste RTM.">
              <div style={styles.snapshotCard}>
                <span><strong>Codigo:</strong> {selectedExtinguisher.internal_code || "-"}</span>
                <span><strong>Serie:</strong> {selectedExtinguisher.serial_number || "-"}</span>
                <span><strong>Tipo:</strong> {selectedExtinguisher.extinguisher_type || "-"}</span>
                <span><strong>Capacidade:</strong> {selectedExtinguisher.capacity || "-"}</span>
                <span><strong>Localizacao:</strong> {selectedExtinguisher.location_description || "-"}</span>
                <span><strong>Setor:</strong> {selectedExtinguisher.sector || "-"}</span>
              </div>
            </Section>
          ) : null}

          <Section title="Responsavel e rastreabilidade" description="Executor, selo e nivel tecnico da manutencao.">
            <div style={styles.grid}>
              <Field label="Executor da manutencao">
                <input name="executor_name" value={form.executor_name} onChange={handleChange} style={styles.input} placeholder="Ex: Joao Pereira da Silva" />
              </Field>
              <Field label="Selo">
                <input name="seal_number" value={form.seal_number} onChange={handleChange} style={styles.input} placeholder="Ex: ZZV ABC123" />
              </Field>
              <Field label="Nivel de manutencao">
                <input type="number" name="maintenance_level" value={form.maintenance_level} onChange={handleChange} style={styles.input} placeholder="Ex: 2" />
              </Field>
              <Field label="Ano de fabricacao">
                <input type="number" name="manufacture_year_snapshot" value={form.manufacture_year_snapshot} onChange={handleChange} style={styles.input} placeholder="Ex: 2024" />
              </Field>
              <Field label="Ultimo ensaio / ultima inspecao">
                <input type="number" name="last_inspection_year" value={form.last_inspection_year} onChange={handleChange} style={styles.input} placeholder="Ex: 25" />
              </Field>
            </div>
          </Section>

          <Section title="Dados tecnicos do RTM" description="Valores medidos ou confirmados na manutencao atual.">
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
                <input
                  name="hydrostatic_test_reference"
                  value={form.hydrostatic_test_reference}
                  onChange={handleChange}
                  style={styles.input}
                />
              </Field>
            </div>
          </Section>

          <Section title="Reprovacoes" description="Marque os itens reprovados desta manutencao.">
            <div style={styles.checkboxGrid}>
              <Checkbox label="Pinos" name="rejection_pin" checked={form.rejection_pin} onChange={handleChange} />
              <Checkbox label="Rosca" name="rejection_thread" checked={form.rejection_thread} onChange={handleChange} />
              <Checkbox label="Valvula" name="rejection_valve" checked={form.rejection_valve} onChange={handleChange} />
              <Checkbox
                label="Indicador de pressao"
                name="rejection_pressure_gauge"
                checked={form.rejection_pressure_gauge}
                onChange={handleChange}
              />
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

          <div style={styles.actions}>
            <button type="submit" style={styles.primaryButton} disabled={loading}>
              {loading ? "Salvando..." : "Salvar RTM"}
            </button>

            <button type="button" style={styles.secondaryButton} onClick={onCancel} disabled={loading}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>{title}</h3>
        <p style={styles.sectionDescription}>{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, fullWidth = false }) {
  return (
    <div style={{ ...styles.field, ...(fullWidth ? styles.fullWidth : null) }}>
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
};

const styles = {
  shell: {
    width: "100%",
    padding: "0",
    margin: 0,
    fontFamily: "Inter, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "100%",
    background: "#FFFFFF",
    borderRadius: "20px",
    padding: "28px",
    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
    border: "1px solid #E2E8F0",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "20px",
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
  section: {
    marginTop: "24px",
    paddingTop: "24px",
    borderTop: "1px solid #E2E8F0",
  },
  sectionHeader: {
    marginBottom: "16px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionDescription: {
    margin: "6px 0 0 0",
    color: "#64748B",
    fontSize: "13px",
    lineHeight: 1.5,
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
  fullWidth: {
    gridColumn: "1 / -1",
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
    minHeight: "120px",
    resize: "vertical",
    fontFamily: "Inter, sans-serif",
  },
  snapshotCard: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
    padding: "16px",
    borderRadius: "16px",
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    color: "#334155",
    fontSize: "14px",
  },
  checkboxGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "18px",
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
  actions: {
    display: "flex",
    gap: "12px",
    marginTop: "24px",
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
