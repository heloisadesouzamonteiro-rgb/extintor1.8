import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import {
  formatCpfOrCnpj,
  formatPhone,
  formatZipCode,
  isValidCpfOrCnpj,
  isValidEmail,
} from "../utils/formUtils";

const estados = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const initialForm = {
  name: "",
  document: "",
  email: "",
  phone: "",
  contact_name: "",
  city: "",
  state: "",
  zip_code: "",
  address: "",
  notes: "",
  has_single_unit: true,
  unit_name: "Matriz",
  unit_address: "",
  unit_city: "",
  unit_state: "",
  unit_notes: "",
};

export default function ClienteForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState(initialForm);
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", session.user.id)
        .single();

      if (!error && profile?.company_id) {
        setCompanyId(profile.company_id);
      }
    }

    fetchProfile();
  }, []);

  const unitPreview = useMemo(() => {
    if (form.has_single_unit) {
      return {
        name: "Matriz",
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        notes: form.notes.trim(),
      };
    }

    return {
      name: form.unit_name.trim(),
      address: form.unit_address.trim(),
      city: form.unit_city.trim(),
      state: form.unit_state.trim(),
      notes: form.unit_notes.trim(),
    };
  }, [form]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    const nextValue = type === "checkbox" ? checked : value;
    const formattedValue =
      name === "document"
        ? formatCpfOrCnpj(nextValue)
        : name === "phone"
          ? formatPhone(nextValue)
          : name === "zip_code"
            ? formatZipCode(nextValue)
            : nextValue;

    setForm((prev) => {
      const next = { ...prev, [name]: formattedValue };

      if (name === "has_single_unit" && checked) {
        next.unit_name = "Matriz";
        next.unit_address = "";
        next.unit_city = "";
        next.unit_state = "";
        next.unit_notes = "";
      }

      return next;
    });

    if (erro) setErro("");
    if (sucesso) setSucesso("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setLoading(true);

    const clientPayload = {
      company_id: companyId,
      name: form.name.trim(),
      document: form.document.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      contact_name: form.contact_name.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      zip_code: form.zip_code.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      is_active: true,
    };

    if (!clientPayload.name) {
      setErro("Informe o nome do cliente.");
      setLoading(false);
      return;
    }

    if (!clientPayload.company_id) {
      setErro("Nao foi possivel identificar a empresa logada.");
      setLoading(false);
      return;
    }

    if (clientPayload.document && !isValidCpfOrCnpj(clientPayload.document)) {
      setErro("Informe um CPF ou CNPJ valido.");
      setLoading(false);
      return;
    }

    if (clientPayload.email && !isValidEmail(clientPayload.email)) {
      setErro("Informe um email valido.");
      setLoading(false);
      return;
    }

    if (!unitPreview.name) {
      setErro("Informe o nome da unidade.");
      setLoading(false);
      return;
    }

    const { data: createdClient, error: clientError } = await supabase
      .from("clients")
      .insert(clientPayload)
      .select("id")
      .single();

    if (clientError || !createdClient?.id) {
      setLoading(false);
      setErro("Nao foi possivel cadastrar o cliente. " + (clientError?.message || "Erro desconhecido."));
      return;
    }

    const unitPayload = {
      company_id: companyId,
      client_id: createdClient.id,
      name: unitPreview.name,
      address: unitPreview.address || clientPayload.address,
      city: unitPreview.city || clientPayload.city,
      state: unitPreview.state || clientPayload.state,
      notes: unitPreview.notes || null,
      is_active: true,
    };

    const { error: unitError } = await supabase.from("units").insert([unitPayload]);

    if (unitError) {
      await supabase.from("clients").delete().eq("id", createdClient.id);
      setLoading(false);
      setErro("Nao foi possivel cadastrar a unidade inicial do cliente. " + unitError.message);
      return;
    }

    setLoading(false);
    setSucesso("Cliente e unidade inicial cadastrados com sucesso!");
    setForm(initialForm);

    setTimeout(() => {
      if (onSuccess) onSuccess();
    }, 1600);
  }

  return (
    <div style={styles.wrapper}>
      <form style={styles.formCard} onSubmit={handleSubmit}>
        {(erro || sucesso) && (
          <div
            style={{
              ...styles.alertBox,
              ...(erro ? styles.alertError : styles.alertSuccess),
            }}
          >
            <div style={styles.alertIcon}>{erro ? "!" : "OK"}</div>
            <div style={styles.alertText}>{erro || sucesso}</div>
          </div>
        )}

        <div style={styles.sectionTitle}>Dados do cliente</div>

        <div style={styles.formGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Nome do cliente</label>
            <input
              name="name"
              placeholder="Ex: Hospital Sao Lucas"
              value={form.name}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>CNPJ / CPF</label>
            <input
              name="document"
              placeholder="00.000.000/0001-00"
              value={form.document}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              name="email"
              placeholder="contato@empresa.com"
              value={form.email}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Telefone</label>
            <input
              name="phone"
              placeholder="(00) 00000-0000"
              value={form.phone}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Nome do contato</label>
            <input
              name="contact_name"
              placeholder="Responsavel"
              value={form.contact_name}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Cidade</label>
            <input
              name="city"
              placeholder="Cidade"
              value={form.city}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Estado</label>
            <select
              name="state"
              value={form.state}
              onChange={handleChange}
              style={styles.select}
            >
              <option value="">UF</option>
              {estados.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>CEP</label>
            <input
              name="zip_code"
              placeholder="00000-000"
              value={form.zip_code}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={{ ...styles.inputGroup, gridColumn: "1 / -1" }}>
            <label style={styles.label}>Endereco</label>
            <input
              name="address"
              placeholder="Rua, numero, bairro..."
              value={form.address}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <div style={{ ...styles.inputGroup, gridColumn: "1 / -1" }}>
            <label style={styles.label}>Observacoes</label>
            <textarea
              name="notes"
              placeholder="Informacoes adicionais do cliente"
              value={form.notes}
              onChange={handleChange}
              style={styles.textarea}
            />
          </div>
        </div>

        <div style={styles.sectionDivider} />
        <div style={styles.sectionTitle}>Primeira unidade</div>

        <label style={styles.checkboxCard}>
          <input
            type="checkbox"
            name="has_single_unit"
            checked={form.has_single_unit}
            onChange={handleChange}
          />
          <div>
            <div style={styles.checkboxTitle}>Cliente com unidade unica</div>
            <div style={styles.checkboxText}>
              Marca automaticamente a unidade como <strong>Matriz</strong> e reaproveita os dados do endereco do cliente.
            </div>
          </div>
        </label>

        {form.has_single_unit ? (
          <div style={styles.previewBox}>
            <div style={styles.previewTitle}>Unidade criada automaticamente</div>
            <div style={styles.previewText}>Nome: Matriz</div>
            <div style={styles.previewText}>Endereco: {form.address || "Mesmo endereco do cliente quando informado"}</div>
            <div style={styles.previewText}>Cidade/UF: {[form.city, form.state].filter(Boolean).join("/") || "Mesmo cadastro do cliente"}</div>
          </div>
        ) : (
          <div style={styles.formGrid}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nome da unidade</label>
              <input
                name="unit_name"
                placeholder="Ex: Loja Centro"
                value={form.unit_name}
                onChange={handleChange}
                style={styles.input}
                required={!form.has_single_unit}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Cidade da unidade</label>
              <input
                name="unit_city"
                placeholder="Cidade"
                value={form.unit_city}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Estado da unidade</label>
              <select
                name="unit_state"
                value={form.unit_state}
                onChange={handleChange}
                style={styles.select}
              >
                <option value="">UF</option>
                {estados.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ ...styles.inputGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Endereco da unidade</label>
              <input
                name="unit_address"
                placeholder="Rua, numero, bairro..."
                value={form.unit_address}
                onChange={handleChange}
                style={styles.input}
              />
            </div>

            <div style={{ ...styles.inputGroup, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Observacoes da unidade</label>
              <textarea
                name="unit_notes"
                placeholder="Informacoes adicionais da unidade"
                value={form.unit_notes}
                onChange={handleChange}
                style={styles.textarea}
              />
            </div>
          </div>
        )}

        <div style={styles.buttonRow}>
          <button type="submit" style={styles.primaryButton} disabled={loading}>
            {loading ? "Salvando..." : "Salvar cliente"}
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

  formCard: {
    width: "100%",
    maxWidth: "860px",
    background: "#FFFFFF",
    borderRadius: "18px",
    boxShadow: "0 18px 45px rgba(0,0,0,0.25)",
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    gap: "22px",
  },

  header: {
    textAlign: "center",
  },

  title: {
    fontSize: "28px",
    color: "#0F172A",
    fontWeight: "600",
    margin: "0 0 8px 0",
  },

  subtitle: {
    fontSize: "14px",
    color: "#64748B",
    margin: 0,
    lineHeight: 1.5,
  },

  sectionTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0F172A",
  },

  sectionDivider: {
    height: "1px",
    background: "#E2E8F0",
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
    display: "block",
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

  select: {
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

  checkboxCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "16px",
    borderRadius: "12px",
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    color: "#0F172A",
  },

  checkboxTitle: {
    fontSize: "14px",
    fontWeight: "700",
    marginBottom: "4px",
  },

  checkboxText: {
    fontSize: "13px",
    color: "#64748B",
    lineHeight: 1.5,
  },

  previewBox: {
    padding: "16px",
    borderRadius: "12px",
    background: "#F0FDF4",
    border: "1px solid #BBF7D0",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  previewTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#166534",
  },

  previewText: {
    fontSize: "13px",
    color: "#166534",
  },

  buttonRow: {
    display: "flex",
    gap: "12px",
    marginTop: "4px",
  },

  primaryButton: {
    flex: 1,
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background: "#1DB954",
    color: "#FFFFFF",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "0.2s",
  },

  secondaryButton: {
    flex: 1,
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
};
