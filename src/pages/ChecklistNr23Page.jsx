import { useEffect, useState } from "react";
import { isCalculatorLeadEmailConfigured, sendCalculatorLeadEmail } from "../services/calculatorLeadEmail";
import "../styles/calculator-page.css";

const leadInitialState = {
  name: "",
  company: "",
  phone: "",
  email: "",
  profile: "",
};

const checklistUrl = "/checklist_inspecao_extintores_nr23.pdf";

const checklistHighlights = [
  "Modelo rapido para uso comercial",
  "Checklist pronto para baixar em PDF",
  "Ideal para captar e atender mais rapido",
];

const leadProfileOptions = [
  "Sou dono ou socio da empresa",
  "Sou gestor ou comercial",
  "Sou tecnico",
  "Sou autonomo",
  "Outro",
];

export default function ChecklistNr23Page() {
  const [leadForm, setLeadForm] = useState(leadInitialState);
  const [leadErrors, setLeadErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [leadReleased, setLeadReleased] = useState(false);
  const [savedLead, setSavedLead] = useState(null);

  useEffect(() => {
    const origin = window.location.origin;
    const canonicalUrl = `${origin}/checklist-nr23`;
    const title = "Checklist de Inspecao de Extintores NR23 | Extintoria";
    const description =
      "Preencha seus dados e receba acesso ao checklist de inspecao de extintores NR23 em PDF.";

    document.title = title;
    updateMetaTag('meta[name="description"]', "content", description);
    updateMetaTag('meta[property="og:title"]', "content", title);
    updateMetaTag('meta[property="og:description"]', "content", description);
    updateMetaTag('meta[property="og:url"]', "content", canonicalUrl);
    updateMetaTag('meta[name="twitter:title"]', "content", title);
    updateMetaTag('meta[name="twitter:description"]', "content", description);

    const canonicalLink = document.getElementById("canonical-link");
    if (canonicalLink) {
      canonicalLink.setAttribute("href", canonicalUrl);
    }

    const schemaNode = document.getElementById("seo-structured-data");
    if (schemaNode) {
      schemaNode.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        description,
        url: canonicalUrl,
      });
    }
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setLeadForm((prev) => ({ ...prev, [name]: value }));
    setLeadErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");

    const validation = validateLeadForm(leadForm);
    setLeadErrors(validation.errors);

    if (!validation.isValid) {
      return;
    }

    if (!isCalculatorLeadEmailConfigured()) {
      setSubmitError("Configure o Web3Forms para receber os leads do checklist por e-mail.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: leadForm.name.trim(),
        company: leadForm.company.trim(),
        phone: leadForm.phone.trim(),
        email: leadForm.email.trim().toLowerCase(),
        profile: leadForm.profile,
        page: "/checklist-nr23",
        source: "checklist_nr23_extintoria",
      };

      await sendCalculatorLeadEmail({
        ...payload,
        subject: "Novo lead do checklist NR23",
      });

      setSavedLead(payload);
      setLeadReleased(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel liberar o checklist agora.";
      setSubmitError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="calculator-page">
      <div className="calculator-page__glow calculator-page__glow--left" aria-hidden="true" />
      <div className="calculator-page__glow calculator-page__glow--right" aria-hidden="true" />

      <header className="calculator-topbar">
        <a className="calculator-brand" href="/landing" aria-label="Ir para a landing principal do Extintoria">
          <span className="calculator-brand__mark">E</span>
          <span className="calculator-brand__text">
            <strong>Extintoria</strong>
            <small>Material comercial para empresas de extintores</small>
          </span>
        </a>
      </header>

      <main className="calculator-main">
        <section className="calculator-hero">
          <div className="calculator-hero__copy">
            <span className="calculator-pill">Checklist gratuito</span>
            <h1>Baixe o checklist de inspecao de extintores NR23</h1>
            <p>Preencha seus dados para liberar gratuitamente o checklist em PDF.</p>

            <div className="calculator-benefit-list" aria-label="Beneficios do checklist">
              {checklistHighlights.map((highlight) => (
                <div key={highlight} className="calculator-benefit-list__item">
                  <CheckIcon />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="calculator-stage-card">
            {!leadReleased ? (
              <form className="lead-capture-card" onSubmit={handleSubmit}>
                <div className="lead-capture-card__header">
                  <span className="calculator-pill calculator-pill--soft">Libere agora</span>
                  <h2>Liberar checklist gratis</h2>
                  <p>Preencha seus dados e receba acesso imediato ao material.</p>
                </div>

                <div className="lead-capture-card__grid">
                  <Field
                    label="Nome"
                    name="name"
                    value={leadForm.name}
                    onChange={handleChange}
                    placeholder="Seu nome"
                    error={leadErrors.name}
                    autoComplete="name"
                  />
                  <Field
                    label="Empresa"
                    name="company"
                    value={leadForm.company}
                    onChange={handleChange}
                    placeholder="Nome da empresa"
                    error={leadErrors.company}
                    autoComplete="organization"
                  />
                  <Field
                    label="WhatsApp"
                    name="phone"
                    value={leadForm.phone}
                    onChange={handleChange}
                    placeholder="(11) 99999-9999"
                    error={leadErrors.phone}
                    autoComplete="tel"
                  />
                  <Field
                    label="E-mail"
                    name="email"
                    type="email"
                    value={leadForm.email}
                    onChange={handleChange}
                    placeholder="voce@empresa.com"
                    error={leadErrors.email}
                    autoComplete="email"
                  />
                  <SelectField
                    label="Qual melhor descreve voce?"
                    name="profile"
                    value={leadForm.profile}
                    onChange={handleChange}
                    error={leadErrors.profile}
                    options={leadProfileOptions}
                  />
                </div>

                {submitError ? <p className="form-feedback form-feedback--error">{submitError}</p> : null}

                <button type="submit" className="calculator-primary-button calculator-primary-button--full" disabled={saving}>
                  {saving ? "Liberando..." : "Liberar checklist gratis"}
                </button>
              </form>
            ) : (
              <div className="lead-success-card lead-success-card--download">
                <span className="calculator-pill">Checklist liberado</span>
                <h2>Pronto, Win foi liberado.</h2>
                <p>
                  {savedLead?.name ? `${savedLead.name}, ` : ""}
                  seu checklist ja esta disponivel para download imediato.
                </p>
                <div className="lead-success-card__identity">
                  <span>{savedLead?.company}</span>
                  <span>{savedLead?.email}</span>
                </div>
                <a className="calculator-primary-button calculator-primary-button--full" href={checklistUrl} target="_blank" rel="noreferrer" download>
                  Baixar checklist em PDF
                </a>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, error, ...props }) {
  return (
    <label className="calculator-field">
      <span>{label}</span>
      <input {...props} />
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}

function SelectField({ label, error, options, ...props }) {
  return (
    <label className="calculator-field">
      <span>{label}</span>
      <select {...props}>
        <option value="">Selecione uma opcao</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}

function validateLeadForm(formData) {
  const errors = {};
  const name = formData.name.trim();
  const company = formData.company.trim();
  const phone = formData.phone.trim();
  const email = formData.email.trim();
  const profile = formData.profile.trim();

  if (name.length < 2) {
    errors.name = "Informe seu nome.";
  }

  if (company.length < 2) {
    errors.company = "Informe sua empresa.";
  }

  if (!isValidPhone(phone)) {
    errors.phone = "Informe um WhatsApp valido com DDD.";
  }

  if (!isValidEmail(email)) {
    errors.email = "Informe um e-mail valido.";
  }

  if (!profile) {
    errors.profile = "Selecione uma opcao.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

function updateMetaTag(selector, attribute, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.setAttribute(attribute, value);
  }
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9.55 17.29-4.24-4.24 1.41-1.41 2.83 2.83 7.73-7.73 1.41 1.41-9.14 9.14Z" fill="currentColor" />
    </svg>
  );
}
