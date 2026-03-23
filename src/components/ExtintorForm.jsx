import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { buildExtinguisherPayload, initialExtinguisherForm } from "./extinguisherFormFields";

export default function ExtintorForm({ onSuccess, onCancel }) {
  const [clientes, setClientes] = useState([]);
  const [units, setUnits] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [creatorName, setCreatorName] = useState("");
  const [form, setForm] = useState(initialExtinguisherForm);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, company_id, name")
        .eq("id", session.user.id)
        .single();

      if (profile?.company_id) {
        setCompanyId(profile.company_id);
        setCreatorName(profile.name || session.user.email || "");
        setForm((prev) => ({
          ...prev,
          executante_manutencao: prev.executante_manutencao || profile.name || session.user.email || "",
        }));

        const { data: clients } = await supabase
          .from("clients")
          .select("id, name")
          .eq("company_id", profile.company_id)
          .order("name", { ascending: true });

        setClientes(clients || []);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    async function loadUnits() {
      if (!form.client_id) {
        setUnits([]);
        return;
      }

      const { data: unitsData } = await supabase
        .from("units")
        .select("id, name")
        .eq("client_id", form.client_id)
        .order("name", { ascending: true });

      const nextUnits = unitsData || [];
      setUnits(nextUnits);
      setForm((prev) => ({
        ...prev,
        unit_id: nextUnits.length === 1 ? nextUnits[0].id : prev.unit_id,
      }));
    }

    loadUnits();
  }, [form.client_id]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;

    setForm((prev) => {
      const nextForm = { ...prev, [name]: nextValue };
      if (name === "client_id") {
        nextForm.unit_id = "";
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

    if (!companyId) {
      setErro("Empresa nao identificada.");
      setLoading(false);
      return;
    }

    if (!form.patrimonio_codigo.trim()) {
      setErro("Informe o patrimonio / codigo.");
      setLoading(false);
      return;
    }

    if (!form.tipo.trim()) {
      setErro("Informe o tipo do extintor.");
      setLoading(false);
      return;
    }

    if (!form.localizacao.trim()) {
      setErro("Informe a localizacao do extintor.");
      setLoading(false);
      return;
    }

    const payload = buildExtinguisherPayload(
      {
        ...form,
        executante_manutencao: form.executante_manutencao || creatorName || "",
      },
      companyId,
    );

    const { error } = await supabase.from("extinguishers").insert([payload]);

    setLoading(false);

    if (error) {
      setErro("Nao foi possivel cadastrar o extintor. " + error.message);
      return;
    }

    setSucesso("Extintor cadastrado com sucesso!");
    setForm({
      ...initialExtinguisherForm,
      executante_manutencao: creatorName || "",
    });
    setUnits([]);

    setTimeout(() => {
      if (onSuccess) onSuccess("listarExtintores");
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
          <Section title="Vinculo operacional" description="Cliente e unidade atendida.">
            <div style={styles.grid}>
              <Field label="Cliente" fullWidth>
                <select name="client_id" value={form.client_id} onChange={handleChange} style={styles.input} required>
                  <option value="">Selecione um cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.name}
                    </option>
                  ))}
                </select>
              </Field>

              {form.client_id ? (
                <Field label="Unidade" fullWidth>
                  <select name="unit_id" value={form.unit_id} onChange={handleChange} style={styles.input} required>
                    <option value="">Selecione a unidade</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </div>
          </Section>

          <Section title="Identificacao do equipamento" description="Campos fixos para localizar e rastrear o extintor.">
            <div style={styles.grid}>
              <Field label="Patrimonio / codigo">
                <input name="patrimonio_codigo" value={form.patrimonio_codigo} onChange={handleChange} style={styles.input} placeholder="Ex: EXT-001" />
              </Field>
              <Field label="Numero de serie">
                <input name="numero_serie" value={form.numero_serie} onChange={handleChange} style={styles.input} placeholder="Ex: 003324" />
              </Field>
              <Field label="Tipo">
                <input name="tipo" value={form.tipo} onChange={handleChange} style={styles.input} placeholder="Ex: PQS BC" />
              </Field>
              <Field label="Capacidade">
                <input name="capacidade" value={form.capacidade} onChange={handleChange} style={styles.input} placeholder="Ex: 6 kg" />
              </Field>
              <Field label="Agente">
                <input name="agente" value={form.agente} onChange={handleChange} style={styles.input} placeholder="Ex: Po quimico seco" />
              </Field>
              <Field label="Fabricante">
                <input name="fabricante" value={form.fabricante} onChange={handleChange} style={styles.input} placeholder="Ex: Metalcasty" />
              </Field>
              <Field label="Codigo do projeto">
                <input name="codigo_projeto" value={form.codigo_projeto} onChange={handleChange} style={styles.input} placeholder="Ex: Projeto interno" />
              </Field>
              <Field label="Norma">
                <input name="norma" value={form.norma} onChange={handleChange} style={styles.input} placeholder="Ex: 10241" />
              </Field>
              <Field label="Localizacao">
                <input name="localizacao" value={form.localizacao} onChange={handleChange} style={styles.input} placeholder="Ex: Corredor principal" />
              </Field>
              <Field label="Setor">
                <input name="setor" value={form.setor} onChange={handleChange} style={styles.input} placeholder="Ex: Administrativo" />
              </Field>
            </div>
          </Section>

          <Section title="Fabricacao e controle" description="Datas e anos que aparecem no cadastro tecnico da operacao.">
            <div style={styles.grid}>
              <Field label="Data de fabricacao">
                <input type="date" name="fabricacao" value={form.fabricacao} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Ano de fabricacao">
                <input type="number" name="ano_fabricacao" value={form.ano_fabricacao} onChange={handleChange} style={styles.input} placeholder="Ex: 2024" />
              </Field>
              <Field label="Validade">
                <input type="date" name="validade" value={form.validade} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Ultima manutencao">
                <input type="date" name="ultima_manutencao" value={form.ultima_manutencao} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Proxima manutencao">
                <input type="date" name="proxima_manutencao" value={form.proxima_manutencao} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Ultimo ensaio / ultima inspecao">
                <input type="number" name="ultimo_ensaio" value={form.ultimo_ensaio} onChange={handleChange} style={styles.input} placeholder="Ex: 24" />
              </Field>
              <Field label="Nivel de manutencao">
                <input type="number" name="nivel_manutencao" value={form.nivel_manutencao} onChange={handleChange} style={styles.input} placeholder="Ex: 2" />
              </Field>
              <Field label="Status">
                <select name="status" value={form.status} onChange={handleChange} style={styles.input}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="manutencao">Manutencao</option>
                  <option value="vencido">Vencido</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Dados tecnicos atuais" description="Snapshot tecnico do equipamento, alinhado ao preenchimento real do RTM.">
            <div style={styles.grid}>
              <Field label="Peso bruto">
                <input type="number" step="0.01" name="peso_bruto" value={form.peso_bruto} onChange={handleChange} style={styles.input} placeholder="Ex: 10.5" />
              </Field>
              <Field label="Peso tara">
                <input type="number" step="0.01" name="peso_tara" value={form.peso_tara} onChange={handleChange} style={styles.input} placeholder="Ex: 4.1" />
              </Field>
              <Field label="Peso total">
                <input type="number" step="0.01" name="peso_total" value={form.peso_total} onChange={handleChange} style={styles.input} placeholder="Ex: 11.0" />
              </Field>
              <Field label="Perda percentual">
                <input type="number" step="0.01" name="perda_percentual" value={form.perda_percentual} onChange={handleChange} style={styles.input} placeholder="Ex: 3.5" />
              </Field>
              <Field label="Pressao">
                <input type="number" step="0.01" name="pressao" value={form.pressao} onChange={handleChange} style={styles.input} placeholder="Ex: 12" />
              </Field>
              <Field label="Volume">
                <input type="number" step="0.01" name="volume" value={form.volume} onChange={handleChange} style={styles.input} placeholder="Ex: 6" />
              </Field>
              <Field label="Capacidade de carga">
                <input name="capacidade_carga" value={form.capacidade_carga} onChange={handleChange} style={styles.input} placeholder="Ex: 6 kg" />
              </Field>
              <Field label="Referencia do ensaio hidrostatico">
                <input
                  name="ensaio_hidrostatico_referencia"
                  value={form.ensaio_hidrostatico_referencia}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Ex: CI / lote"
                />
              </Field>
            </div>
          </Section>

          <Section title="Selo e executor" description="Informacoes importantes para rastreabilidade da manutencao.">
            <div style={styles.grid}>
              <Field label="Executante da manutencao">
                <input
                  name="executante_manutencao"
                  value={form.executante_manutencao}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Ex: Tecnico responsavel"
                />
              </Field>
              <Field label="Selo Inmetro">
                <input name="selo_inmetro" value={form.selo_inmetro} onChange={handleChange} style={styles.input} placeholder="Ex: ZZV ABC123" />
              </Field>
            </div>
          </Section>

          <Section title="Reprovacoes e observacoes" description="Itens de reprovacao que aparecem no relatorio tecnico.">
            <div style={styles.checkboxGrid}>
              <Checkbox label="Pinos" name="reprovacao_pinos" checked={form.reprovacao_pinos} onChange={handleChange} />
              <Checkbox label="Rosca" name="reprovacao_rosca" checked={form.reprovacao_rosca} onChange={handleChange} />
              <Checkbox label="Valvula" name="reprovacao_valvula" checked={form.reprovacao_valvula} onChange={handleChange} />
              <Checkbox
                label="Indicador de pressao"
                name="reprovacao_indicador_pressao"
                checked={form.reprovacao_indicador_pressao}
                onChange={handleChange}
              />
              <Checkbox label="Mangueira" name="reprovacao_mangueira" checked={form.reprovacao_mangueira} onChange={handleChange} />
            </div>

            <div style={styles.grid}>
              <Field label="Motivo da reprovacao" fullWidth>
                <textarea
                  name="motivo_reprovacao"
                  value={form.motivo_reprovacao}
                  onChange={handleChange}
                  style={styles.textarea}
                  placeholder="Descreva o motivo, se houver."
                />
              </Field>
              <Field label="Observacoes gerais" fullWidth>
                <textarea
                  name="observacoes"
                  value={form.observacoes}
                  onChange={handleChange}
                  style={styles.textarea}
                  placeholder="Informacoes adicionais do extintor"
                />
              </Field>
            </div>
          </Section>

          <div style={styles.actions}>
            <button type="submit" style={styles.primaryButton} disabled={loading}>
              {loading ? "Salvando..." : "Salvar extintor"}
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
  checkboxGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "18px",
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
    ...baseInput,
    minHeight: "48px",
  },
  textarea: {
    ...baseInput,
    minHeight: "120px",
    resize: "vertical",
    fontFamily: "Inter, sans-serif",
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
