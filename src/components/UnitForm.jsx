import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";

const initialForm = {
  client_id: "",
  name: "",
  address: "",
  city: "",
  state: "",
  notes: "",
};

const estados = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export default function UnitForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState(initialForm);
  const [companyId, setCompanyId] = useState("");
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    async function fetchData() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      if (profile?.company_id) setCompanyId(profile.company_id);
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name")
        .eq("company_id", profile.company_id);
      setClientes(clients || []);
    }
    fetchData();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
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
    if (!form.name.trim()) {
      setErro("Informe o nome da unidade.");
      setLoading(false);
      return;
    }
    const payload = {
      company_id: companyId,
      client_id: form.client_id,
      name: form.name.trim(),
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state || null,
      notes: form.notes.trim() || null,
      is_active: true,
    };
    const { error } = await supabase.from("units").insert([payload]);
    setLoading(false);
    if (error) {
      setErro("Não foi possível cadastrar a unidade. " + error.message);
      return;
    }
    setSucesso("Unidade cadastrada com sucesso!");
    setForm(initialForm);
    setTimeout(() => {
      if (onSuccess) onSuccess();
    }, 1200);
  }

  return (
    <div style={styles.wrapper}>
      {(erro || sucesso) && (
        <div style={{ ...styles.alert, ...(erro ? styles.alertError : styles.alertSuccess) }}>
          {erro || sucesso}
        </div>
      )}
      <form style={styles.form} onSubmit={handleSubmit}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Cliente</label>
          <select name="client_id" value={form.client_id} onChange={handleChange} style={styles.input} required>
            <option value="">Selecione o cliente</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Nome da unidade</label>
          <input name="name" value={form.name} onChange={handleChange} style={styles.input} required />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Endereço</label>
          <input name="address" value={form.address} onChange={handleChange} style={styles.input} />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Cidade</label>
          <input name="city" value={form.city} onChange={handleChange} style={styles.input} />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Estado</label>
          <select name="state" value={form.state} onChange={handleChange} style={styles.input}>
            <option value="">UF</option>
            {estados.map(uf => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Observações</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} style={styles.textarea} />
        </div>
        <div style={styles.btnRow}>
          <button type="submit" style={styles.button} disabled={loading}>{loading ? "Salvando..." : "Salvar unidade"}</button>
          <button type="button" style={styles.buttonSecondary} onClick={onCancel} disabled={loading}>Cancelar</button>
              <button type="button" style={styles.buttonSecondary} onClick={() => onCancel && onCancel()}>Voltar</button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  wrapper: {
    background: "#fff",
    borderRadius: "18px",
    boxShadow: "0 18px 45px rgba(0,0,0,0.25)",
    padding: "32px",
    maxWidth: "600px",
    margin: "0 auto",
    width: "100%",
    fontFamily: "Inter, sans-serif",
  },
  header: {
    textAlign: "center",
    marginBottom: "18px",
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
  alert: {
    marginBottom: "18px",
    padding: "14px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "500",
    textAlign: "center",
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
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "0.95rem",
    color: "#334155",
    fontWeight: "500",
    marginBottom: "2px",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #CBD5E1",
    fontSize: "14px",
    background: "#F8FAFC",
    transition: "border 0.2s",
  },
  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #CBD5E1",
    fontSize: "14px",
    minHeight: "110px",
    resize: "vertical",
    background: "#F8FAFC",
  },
  btnRow: {
    display: "flex",
    gap: "12px",
    marginTop: "10px",
    width: "100%",
  },
  button: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "8px",
    background: "#1DB954",
    color: "white",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "0.2s",
  },
  buttonSecondary: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "8px",
    background: "#E2E8F0",
    color: "#0F172A",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "0.2s",
  },
};
