import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { buildExtinguisherPayload, initialExtinguisherForm, mapExtinguisherToForm } from "./extinguisherFormFields";
import ConfirmDialog from "./ConfirmDialog";

export default function ExtintorFicha({ extintor, onClose, onUpdate }) {
  const [form, setForm] = useState(initialExtinguisherForm);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!extintor) return;
    setForm((prev) => ({
      ...prev,
      ...mapExtinguisherToForm(extintor),
    }));
  }, [extintor]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));

    if (erro) setErro("");
    if (sucesso) setSucesso("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro("");
    setSucesso("");
    setLoading(true);

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

    const payload = buildExtinguisherPayload(form);

    const { error } = await supabase.from("extinguishers").update(payload).eq("id", extintor.id);

    setLoading(false);

    if (error) {
      if (error.message?.includes("extinguishers_company_internal_code_unique")) {
        setErro("Ja existe um extintor cadastrado com esse patrimonio / codigo.");
      } else {
        setErro("Nao foi possivel atualizar o extintor. " + error.message);
      }
      return;
    }

    setSucesso("Extintor atualizado com sucesso!");

    setTimeout(() => {
      if (onUpdate) onUpdate();
    }, 1000);
  }

  async function handleDeleteExtinguisher() {
    setErro("");
    setSucesso("");
    setLoading(true);

    const { error } = await supabase.from("extinguishers").delete().eq("id", extintor.id);

    setLoading(false);

    if (error) {
      setErro("Nao foi possivel excluir o extintor. " + error.message);
      return;
    }

    setSucesso("Extintor excluido com sucesso!");

    setTimeout(() => {
      if (onUpdate) onUpdate();
    }, 600);
  }

  return (
    <div style={styles.shell}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Ficha do extintor</h2>
            <p style={styles.subtitle}>Visualize e edite os dados tecnicos do equipamento sem alterar outros modulos.</p>
          </div>

          <button type="button" style={styles.closeTopButton} onClick={onClose} disabled={loading}>
            Fechar
          </button>
        </div>

        {erro || sucesso ? (
          <div style={{ ...styles.feedbackAlert, ...(erro ? styles.feedbackError : styles.feedbackSuccess) }}>{erro || sucesso}</div>
        ) : null}

        <form style={styles.form} onSubmit={handleSubmit}>
          <Section title="Identificacao do equipamento">
            <div style={styles.grid}>
              <Field label="Patrimonio / codigo">
                <input name="patrimonio_codigo" value={form.patrimonio_codigo} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Numero de serie">
                <input name="numero_serie" value={form.numero_serie} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Tipo">
                <input name="tipo" value={form.tipo} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Capacidade">
                <input name="capacidade" value={form.capacidade} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Agente">
                <input name="agente" value={form.agente} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Fabricante">
                <input name="fabricante" value={form.fabricante} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Codigo do projeto">
                <input name="codigo_projeto" value={form.codigo_projeto} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Norma">
                <input name="norma" value={form.norma} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Localizacao">
                <input name="localizacao" value={form.localizacao} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Setor">
                <input name="setor" value={form.setor} onChange={handleChange} style={styles.input} />
              </Field>
            </div>
          </Section>

          <Section title="Fabricacao e controle">
            <div style={styles.grid}>
              <Field label="Data de fabricacao">
                <input type="date" name="fabricacao" value={form.fabricacao} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Ano de fabricacao">
                <input type="number" name="ano_fabricacao" value={form.ano_fabricacao} onChange={handleChange} style={styles.input} />
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
                <input type="number" name="ultimo_ensaio" value={form.ultimo_ensaio} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Nivel de manutencao">
                <input type="number" name="nivel_manutencao" value={form.nivel_manutencao} onChange={handleChange} style={styles.input} />
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

          <Section title="Dados tecnicos atuais">
            <div style={styles.grid}>
              <Field label="Peso bruto">
                <input type="number" step="0.01" name="peso_bruto" value={form.peso_bruto} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Peso tara">
                <input type="number" step="0.01" name="peso_tara" value={form.peso_tara} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Peso total">
                <input type="number" step="0.01" name="peso_total" value={form.peso_total} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Perda percentual">
                <input type="number" step="0.01" name="perda_percentual" value={form.perda_percentual} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Pressao">
                <input type="number" step="0.01" name="pressao" value={form.pressao} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Volume">
                <input type="number" step="0.01" name="volume" value={form.volume} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Capacidade de carga">
                <input name="capacidade_carga" value={form.capacidade_carga} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Referencia do ensaio hidrostatico">
                <input
                  name="ensaio_hidrostatico_referencia"
                  value={form.ensaio_hidrostatico_referencia}
                  onChange={handleChange}
                  style={styles.input}
                />
              </Field>
            </div>
          </Section>

          <Section title="Selo e executor">
            <div style={styles.grid}>
              <Field label="Executante da manutencao">
                <input name="executante_manutencao" value={form.executante_manutencao} onChange={handleChange} style={styles.input} />
              </Field>
              <Field label="Selo Inmetro">
                <input name="selo_inmetro" value={form.selo_inmetro} onChange={handleChange} style={styles.input} />
              </Field>
            </div>
          </Section>

          <Section title="Reprovacoes e observacoes">
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
                <textarea name="motivo_reprovacao" value={form.motivo_reprovacao} onChange={handleChange} style={styles.textarea} />
              </Field>
              <Field label="Observacoes gerais" fullWidth>
                <textarea name="observacoes" value={form.observacoes} onChange={handleChange} style={styles.textarea} />
              </Field>
            </div>
          </Section>

          <div style={styles.btnRow}>
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Salvando..." : "Salvar alteracoes"}
            </button>

            <button type="button" style={styles.buttonDanger} onClick={() => setConfirmDeleteOpen(true)} disabled={loading}>
              {loading ? "Processando..." : "Excluir extintor"}
            </button>

            <button type="button" style={styles.buttonSecondary} onClick={onClose} disabled={loading}>
              Fechar
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Excluir extintor"
        message={`Tem certeza que deseja excluir o extintor ${form.patrimonio_codigo || ""}?`}
        confirmLabel="Excluir extintor"
        tone="danger"
        loading={loading}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          await handleDeleteExtinguisher();
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
    gap: "22px",
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
