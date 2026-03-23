import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import ConfirmDialog from "./ConfirmDialog";
import {
  formatCpfOrCnpj,
  formatPhone,
  formatZipCode,
  isValidCpfOrCnpj,
  isValidEmail,
} from "../utils/formUtils";

const initialUnitForm = {
  name: "",
  responsible_name: "",
  responsible_phone: "",
  zip_code: "",
  address: "",
  city: "",
  state: "",
  notes: "",
  is_active: true,
};

function buildClientForm(cliente) {
  return {
    name: cliente?.name || "",
    email: cliente?.email || "",
    phone: cliente?.phone || "",
    address: cliente?.address || "",
    document: cliente?.document || "",
    contact_name: cliente?.contact_name || "",
    city: cliente?.city || "",
    state: cliente?.state || "",
    zip_code: cliente?.zip_code || "",
    notes: cliente?.notes || "",
  };
}

export default function ClienteFicha({ cliente, isAdmin = false, onClose, onUpdate }) {
  const [form, setForm] = useState(() => buildClientForm(cliente));

  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState([]);
  const [unitForm, setUnitForm] = useState(initialUnitForm);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [unitError, setUnitError] = useState("");
  const [unitSuccess, setUnitSuccess] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    async function fetchUnits() {
      if (!isAdmin || !cliente?.id) {
        setUnits([]);
        setUnitError("");
        setUnitSuccess("");
        return;
      }

      setLoadingUnits(true);
      setUnitError("");

      const { data, error } = await supabase
        .from("units")
        .select("id, name, address, city, state, zip_code, responsible_name, responsible_phone, notes, is_active, created_at")
        .eq("client_id", cliente.id)
        .eq("company_id", cliente.company_id)
        .order("created_at", { ascending: false });

      setLoadingUnits(false);

      if (error) {
        setUnitError("Nao foi possivel carregar as unidades do cliente.");
        return;
      }

      setUnits(data || []);
    }

    fetchUnits();
  }, [cliente?.company_id, cliente?.id, isAdmin]);

  function handleChange(e) {
    const { name, value } = e.target;
    const formattedValue =
      name === "document"
        ? formatCpfOrCnpj(value)
        : name === "phone"
          ? formatPhone(value)
          : name === "zip_code"
            ? formatZipCode(value)
            : value;

    setForm({ ...form, [name]: formattedValue });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setLoading(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      document: form.document.trim() || null,
      contact_name: form.contact_name.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      zip_code: form.zip_code.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (!payload.name) {
      setErro("Informe o nome do cliente.");
      setLoading(false);
      return;
    }

    if (payload.document && !isValidCpfOrCnpj(payload.document)) {
      setErro("Informe um CPF ou CNPJ valido.");
      setLoading(false);
      return;
    }

    if (payload.email && !isValidEmail(payload.email)) {
      setErro("Informe um email valido.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", cliente.id);

    setLoading(false);

    if (error) {
      setErro("Não foi possível atualizar o cliente. " + error.message);
      return;
    }

    setSucesso("Dados atualizados com sucesso!");

    setTimeout(() => {
      if (onUpdate) onUpdate();
    }, 1000);
  }

  function handleUnitChange(e) {
    const { name, value, type, checked } = e.target;
    const nextValue = type === "checkbox" ? checked : value;
    const formattedValue =
      name === "responsible_phone"
        ? formatPhone(nextValue)
        : name === "zip_code"
          ? formatZipCode(nextValue)
          : nextValue;

    setUnitForm((prev) => ({ ...prev, [name]: formattedValue }));

    if (unitError) setUnitError("");
    if (unitSuccess) setUnitSuccess("");
  }

  async function handleUnitSubmit(e) {
    e.preventDefault();
    setUnitError("");
    setUnitSuccess("");
    setSavingUnit(true);

    if (!cliente?.id || !cliente?.company_id) {
      setUnitError("Nao foi possivel identificar o cliente.");
      setSavingUnit(false);
      return;
    }

    if (!unitForm.name.trim()) {
      setUnitError("Informe o nome da unidade.");
      setSavingUnit(false);
      return;
    }

    const payload = {
      company_id: cliente.company_id,
      client_id: cliente.id,
      name: unitForm.name.trim(),
      responsible_name: unitForm.responsible_name.trim() || null,
      responsible_phone: unitForm.responsible_phone.trim() || null,
      zip_code: unitForm.zip_code.trim() || null,
      address: unitForm.address.trim() || null,
      city: unitForm.city.trim() || null,
      state: unitForm.state.trim() || null,
      notes: unitForm.notes.trim() || null,
      is_active: unitForm.is_active,
    };

    const { data, error } = await supabase
      .from("units")
      .insert(payload)
      .select("id, name, address, city, state, zip_code, responsible_name, responsible_phone, notes, is_active, created_at")
      .single();

    setSavingUnit(false);

    if (error) {
      setUnitError("Nao foi possivel cadastrar a unidade. " + error.message);
      return;
    }

    setUnits((prev) => [data, ...prev]);
    setUnitForm(initialUnitForm);
    setUnitSuccess("Unidade cadastrada com sucesso!");
  }

  async function handleDeleteClient() {
    setErro("");
    setSucesso("");
    setLoading(true);

    const { error } = await supabase.from("clients").delete().eq("id", cliente.id);

    setLoading(false);

    if (error) {
      setErro("Nao foi possivel excluir o cliente. " + error.message);
      return;
    }

    setSucesso("Cliente excluido com sucesso.");

    setTimeout(() => {
      if (onUpdate) onUpdate();
    }, 600);
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.topBrand}>
        <h1 style={styles.topBrandTitle}>ExtintorIA</h1>
        <span style={styles.topBrandSubtitle}>
          Visualize e edite os dados do cliente com praticidade
        </span>
      </div>

      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Editar cliente</h2>
          <p style={styles.subtitle}>
            Os dados atuais já aparecem preenchidos para facilitar a alteração.
          </p>
        </div>

        {(erro || sucesso) && (
          <div
            style={{
              ...styles.alertBox,
              ...(erro ? styles.alertError : styles.alertSuccess),
            }}
          >
            <div style={styles.alertIcon}>{erro ? "⚠" : "✓"}</div>
            <div style={styles.alertText}>{erro || sucesso}</div>
          </div>
        )}

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nome</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                style={styles.input}
                placeholder="Nome do cliente"
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>CNPJ / CPF</label>
              <input
                name="document"
                value={form.document}
                onChange={handleChange}
                style={styles.input}
                placeholder="00.000.000/0001-00"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                style={styles.input}
                placeholder="contato@empresa.com"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Telefone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                style={styles.input}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Nome do contato</label>
              <input
                name="contact_name"
                value={form.contact_name}
                onChange={handleChange}
                style={styles.input}
                placeholder="Responsável"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Cidade</label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                style={styles.input}
                placeholder="Cidade"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Estado</label>
              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                style={styles.input}
                placeholder="UF"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>CEP</label>
              <input
                name="zip_code"
                value={form.zip_code}
                onChange={handleChange}
                style={styles.input}
                placeholder="00000-000"
              />
            </div>

            <div style={{ ...styles.inputGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Endereço</label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                style={styles.input}
                placeholder="Rua, número, bairro..."
              />
            </div>

            <div style={{ ...styles.inputGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Observações</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                style={styles.textarea}
                placeholder="Informações adicionais do cliente"
              />
            </div>
          </div>

          <div style={styles.btnRow}>
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Salvando..." : "Salvar alterações"}
            </button>

            <button
              type="button"
              style={styles.buttonDanger}
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={loading}
            >
              {loading ? "Processando..." : "Excluir cliente"}
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

        {isAdmin && (
          <div style={styles.unitsSection}>
            <div style={styles.unitsHeader}>
              <h3 style={styles.unitsTitle}>Unidades do Cliente</h3>
              <p style={styles.unitsSubtitle}>Liste as unidades ja cadastradas e adicione novas filiais sem criar outro cliente.</p>
            </div>

            {(unitError || unitSuccess) && (
              <div
                style={{
                  ...styles.alertBox,
                  ...(unitError ? styles.alertError : styles.alertSuccess),
                }}
              >
                <div style={styles.alertIcon}>{unitError ? "!" : "OK"}</div>
                <div style={styles.alertText}>{unitError || unitSuccess}</div>
              </div>
            )}

            {loadingUnits ? (
              <div style={styles.unitsEmpty}>Carregando unidades...</div>
            ) : units.length === 0 ? (
              <div style={styles.unitsEmpty}>Nenhuma unidade cadastrada para este cliente.</div>
            ) : (
              <div style={styles.unitsList}>
                {units.map((unit) => (
                  <div key={unit.id} style={styles.unitCard}>
                    <div style={styles.unitCardTitleRow}>
                      <strong style={styles.unitCardTitle}>{unit.name || "Sem nome"}</strong>
                      <span style={{ ...styles.unitBadge, ...(unit.is_active ? styles.unitBadgeActive : styles.unitBadgeInactive) }}>
                        {unit.is_active ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                    <span style={styles.unitCardText}>{unit.city || "-"}{unit.state ? ` / ${unit.state}` : ""}</span>
                    <span style={styles.unitCardText}>{unit.address || "Endereco nao informado"}</span>
                    {unit.responsible_name && <span style={styles.unitCardText}>Responsavel: {unit.responsible_name}</span>}
                    {unit.responsible_phone && <span style={styles.unitCardText}>Telefone: {unit.responsible_phone}</span>}
                  </div>
                ))}
              </div>
            )}

            <form style={styles.unitForm} onSubmit={handleUnitSubmit}>
              <div style={styles.unitFormHeader}>Nova Unidade</div>

              <div style={styles.formGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nome da unidade</label>
                  <input
                    name="name"
                    value={unitForm.name}
                    onChange={handleUnitChange}
                    style={styles.input}
                    placeholder="Ex: Filial Centro"
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Responsavel</label>
                  <input
                    name="responsible_name"
                    value={unitForm.responsible_name}
                    onChange={handleUnitChange}
                    style={styles.input}
                    placeholder="Responsavel local"
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Telefone</label>
                  <input
                    name="responsible_phone"
                    value={unitForm.responsible_phone}
                    onChange={handleUnitChange}
                    style={styles.input}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>CEP</label>
                  <input
                    name="zip_code"
                    value={unitForm.zip_code}
                    onChange={handleUnitChange}
                    style={styles.input}
                    placeholder="00000-000"
                  />
                </div>

                <div style={{ ...styles.inputGroup, gridColumn: "1 / -1" }}>
                  <label style={styles.label}>Endereco</label>
                  <input
                    name="address"
                    value={unitForm.address}
                    onChange={handleUnitChange}
                    style={styles.input}
                    placeholder="Rua, numero, bairro..."
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Cidade</label>
                  <input
                    name="city"
                    value={unitForm.city}
                    onChange={handleUnitChange}
                    style={styles.input}
                    placeholder="Cidade"
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Estado</label>
                  <input
                    name="state"
                    value={unitForm.state}
                    onChange={handleUnitChange}
                    style={styles.input}
                    placeholder="UF"
                  />
                </div>

                <div style={{ ...styles.inputGroup, gridColumn: "1 / -1" }}>
                  <label style={styles.label}>Observacoes</label>
                  <textarea
                    name="notes"
                    value={unitForm.notes}
                    onChange={handleUnitChange}
                    style={styles.textarea}
                    placeholder="Informacoes adicionais da unidade"
                  />
                </div>
              </div>

              <label style={styles.unitCheckboxRow}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={unitForm.is_active}
                  onChange={handleUnitChange}
                />
                <span>Unidade ativa</span>
              </label>

              <button type="submit" style={styles.button} disabled={savingUnit}>
                {savingUnit ? "Salvando unidade..." : "Salvar unidade"}
              </button>
            </form>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Excluir cliente"
        message={`Tem certeza que deseja excluir o cliente ${cliente?.name || ""}?`}
        confirmLabel="Excluir cliente"
        tone="danger"
        loading={loading}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          await handleDeleteClient();
          setConfirmDeleteOpen(false);
        }}
      />
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    minHeight: "100%",
    background: "#0F172A",
    padding: "32px 16px 48px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Inter, sans-serif",
  },

  topBrand: {
    textAlign: "center",
    marginBottom: "24px",
  },

  topBrandTitle: {
    color: "#1DB954",
    fontSize: "30px",
    fontWeight: "600",
    margin: "0 0 6px 0",
  },

  topBrandSubtitle: {
    color: "#CBD5E1",
    fontSize: "14px",
  },

  container: {
    background: "#fff",
    borderRadius: "18px",
    boxShadow: "0 18px 45px rgba(0,0,0,0.25)",
    padding: "32px",
    maxWidth: "860px",
    margin: "0 auto",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "22px",
  },

  header: {
    textAlign: "center",
  },

  title: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#0F172A",
    margin: "0 0 8px 0",
  },

  subtitle: {
    fontSize: "14px",
    color: "#64748B",
    margin: 0,
    lineHeight: 1.5,
  },

  alertBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
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

  alertIcon: {
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.7)",
    flexShrink: 0,
    fontWeight: "700",
  },

  alertText: {
    lineHeight: 1.4,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "18px",
    width: "100%",
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    minWidth: 0,
  },

  label: {
    fontSize: "13px",
    color: "#334155",
    fontWeight: "600",
    margin: 0,
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #CBD5E1",
    fontSize: "14px",
    background: "#F8FAFC",
    color: "#0F172A",
    outline: "none",
    transition: "0.2s",
    boxSizing: "border-box",
  },

  textarea: {
    width: "100%",
    minHeight: "120px",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #CBD5E1",
    fontSize: "14px",
    background: "#F8FAFC",
    color: "#0F172A",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
  },

  btnRow: {
    display: "flex",
    gap: "12px",
    marginTop: "4px",
    width: "100%",
  },

  unitsSection: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    borderTop: "1px solid #E2E8F0",
    paddingTop: "24px",
  },

  unitsHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  unitsTitle: {
    margin: 0,
    fontSize: "22px",
    color: "#0F172A",
  },

  unitsSubtitle: {
    margin: 0,
    fontSize: "14px",
    color: "#64748B",
  },

  unitsList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "14px",
  },

  unitCard: {
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    background: "#F8FAFC",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  unitCardTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
  },

  unitCardTitle: {
    color: "#0F172A",
  },

  unitCardText: {
    fontSize: "13px",
    color: "#475569",
    lineHeight: 1.4,
  },

  unitBadge: {
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 700,
  },

  unitBadgeActive: {
    background: "#DCFCE7",
    color: "#166534",
  },

  unitBadgeInactive: {
    background: "#E2E8F0",
    color: "#475569",
  },

  unitsEmpty: {
    padding: "18px",
    borderRadius: "12px",
    background: "#F8FAFC",
    color: "#64748B",
    textAlign: "center",
  },

  unitForm: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    padding: "18px",
    borderRadius: "14px",
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
  },

  unitFormHeader: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#0F172A",
  },

  unitCheckboxRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    color: "#0F172A",
    fontSize: "14px",
    fontWeight: 600,
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
};
