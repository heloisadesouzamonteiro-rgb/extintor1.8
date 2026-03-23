import { useState } from "react";
import { supabase, invokeSupabaseFunction } from "../services/supabase";
import { formatPhone, isValidEmail } from "../utils/formUtils";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  is_active: true,
  send_access_email: false,
};

export default function TechnicianForm({ companyId, onSuccess, onCancel }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : name === "phone" ? formatPhone(value) : value,
    }));

    if (error) setError("");
    if (success) setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!companyId) {
      setError("Nao foi possivel identificar a empresa logada.");
      return;
    }

    if (!form.name.trim()) {
      setError("Informe o nome do tecnico.");
      return;
    }

    if (!form.email.trim()) {
      setError("Informe o email do tecnico.");
      return;
    }

    if (!isValidEmail(form.email)) {
      setError("Informe um email valido.");
      return;
    }

    setLoading(true);

    let data = null;
    let invokeError = null;

    try {
      const response = await invokeSupabaseFunction("create-technician", {
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          is_active: form.is_active,
          send_access_email: form.send_access_email,
        },
      });

      data = response.data;
      invokeError = response.error;
    } catch (requestError) {
      setLoading(false);
      setError("Nao foi possivel cadastrar o tecnico. " + (requestError instanceof Error ? requestError.message : "Erro inesperado."));
      return;
    }

    setLoading(false);

    if (invokeError) {
      let detailedMessage = invokeError.message;

      if (invokeError.context) {
        try {
          const responsePayload = await invokeError.context.json();
          if (responsePayload?.error) {
            detailedMessage = responsePayload.error;
          } else if (responsePayload?.message) {
            detailedMessage = responsePayload.message;
          }
        } catch {
          try {
            const fallbackText = await invokeError.context.text();
            if (fallbackText) {
              detailedMessage = fallbackText;
            }
          } catch {
            // Keep the original invoke error message when the response body cannot be read.
          }
        }
      }

      setError("Nao foi possivel cadastrar o tecnico. " + detailedMessage);
      return;
    }

    if (data?.error) {
      setError("Nao foi possivel cadastrar o tecnico. " + data.error);
      return;
    }

    const tempPasswordText = data?.temporaryPassword
      ? `\nEmail: ${form.email.trim()}\nSenha temporaria: ${data.temporaryPassword}\nRepasse estes dados ao tecnico e oriente a troca de senha no primeiro acesso.`
      : "";
    const warningText = data?.warning ? `\nAviso: ${data.warning}` : "";

    if (data?.emailSent) {
      setSuccess(`Tecnico cadastrado e email de acesso enviado com sucesso.${warningText}`);
    } else {
      setSuccess(`Tecnico cadastrado com sucesso.${tempPasswordText}${warningText}`);
    }
    setForm(initialForm);

    if (onSuccess) {
      onSuccess();
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={styles.closeButton} disabled={loading}>
            Fechar
          </button>
        )}
      </div>

      {(error || success) && (
        <div style={{ ...styles.alert, ...(error ? styles.alertError : styles.alertSuccess) }}>
          {error || success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.grid}>
          <div style={styles.fieldFull}>
            <label style={styles.label}>Nome</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              style={styles.input}
              placeholder="Ex: Joao Silva"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              style={styles.input}
              placeholder="joao@empresa.com"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Telefone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              style={styles.input}
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>

        <div style={styles.infoBox}>
          A conta do tecnico sera criada com senha temporaria. No primeiro login, ele precisara definir uma nova senha para entrar no painel.
        </div>

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            name="is_active"
            checked={form.is_active}
            onChange={handleChange}
          />
          <span>Ativo</span>
        </label>

        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            name="send_access_email"
            checked={form.send_access_email}
            onChange={handleChange}
          />
          <span>Enviar email com acesso provisorio ao tecnico</span>
        </label>

        <div style={styles.actions}>
          <button type="submit" style={styles.primaryButton} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </button>

          <button type="button" style={styles.secondaryButton} onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  wrapper: {
    background: "#FFFFFF",
    border: "1px solid rgba(226,232,240,0.95)",
    borderRadius: "24px",
    boxShadow: "0 22px 50px rgba(15,23,42,0.08)",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
  },
  title: {
    margin: 0,
    fontSize: "1.45rem",
    fontWeight: 700,
    color: "#0F172A",
  },
  subtitle: {
    margin: "6px 0 0",
    fontSize: "0.96rem",
    lineHeight: 1.6,
    color: "#64748B",
  },
  closeButton: {
    border: "1px solid rgba(226,232,240,0.95)",
    background: "#F8FAFC",
    color: "#0F172A",
    borderRadius: "14px",
    padding: "12px 16px",
    fontWeight: 600,
    cursor: "pointer",
  },
  alert: {
    borderRadius: "16px",
    padding: "14px 16px",
    fontSize: "0.95rem",
    fontWeight: 500,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  alertError: {
    background: "#FFF1F2",
    color: "#BE123C",
    border: "1px solid rgba(244,63,94,0.18)",
  },
  alertSuccess: {
    background: "#F0FDF4",
    color: "#15803D",
    border: "1px solid rgba(34,197,94,0.2)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  fieldFull: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    gridColumn: "1 / -1",
  },
  label: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "#0F172A",
  },
  input: {
    width: "100%",
    borderRadius: "16px",
    border: "1px solid rgba(203,213,225,0.95)",
    background: "#FFFFFF",
    color: "#0F172A",
    padding: "14px 16px",
    fontSize: "0.98rem",
    boxSizing: "border-box",
  },
  checkboxRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "0.95rem",
    color: "#0F172A",
    fontWeight: 600,
  },
  infoBox: {
    borderRadius: "14px",
    padding: "14px 16px",
    background: "#F8FAFC",
    border: "1px solid rgba(226,232,240,0.95)",
    color: "#475569",
    fontSize: "0.94rem",
    lineHeight: 1.6,
  },
  actions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  primaryButton: {
    border: "none",
    background: "linear-gradient(135deg, #1DB954 0%, #169c47 100%)",
    color: "#FFFFFF",
    borderRadius: "14px",
    padding: "13px 18px",
    fontWeight: 700,
    cursor: "pointer",
    minWidth: "120px",
  },
  secondaryButton: {
    border: "1px solid rgba(226,232,240,0.95)",
    background: "#F8FAFC",
    color: "#0F172A",
    borderRadius: "14px",
    padding: "13px 18px",
    fontWeight: 700,
    cursor: "pointer",
    minWidth: "120px",
  },
};
