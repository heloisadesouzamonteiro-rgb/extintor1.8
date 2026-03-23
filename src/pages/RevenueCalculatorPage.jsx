import { useEffect, useMemo, useState } from "react";
import { isCalculatorLeadEmailConfigured, sendCalculatorLeadEmail } from "../services/calculatorLeadEmail";
import { getSupabase, isSupabaseConfigured } from "../services/supabase";
import "../styles/calculator-page.css";

const leadInitialState = {
  name: "",
  company: "",
  phone: "",
  email: "",
  profile: "",
};

const calculatorInitialState = {
  customerCount: "",
  extinguisherCount: "",
  averageAnnualValue: "",
  renewalRate: "100",
  newContractsPerMonth: "",
  averageNewClientTicket: "",
};

const trialUrl = "https://extintoria.wincagenteia.com.br/";
const modalSessionKey = "extintoria-calculator-modal-shown";

const leadProfileOptions = [
  "Sou dono ou socio da empresa",
  "Sou gestor ou comercial",
  "Sou tecnico",
  "Sou autonomo",
  "Outro",
];

export default function RevenueCalculatorPage() {
  const [leadForm, setLeadForm] = useState(leadInitialState);
  const [leadErrors, setLeadErrors] = useState({});
  const [leadSubmitError, setLeadSubmitError] = useState("");
  const [leadSaving, setLeadSaving] = useState(false);
  const [savedLead, setSavedLead] = useState(null);
  const [showLeadCapture, setShowLeadCapture] = useState(false);

  const [calculatorForm, setCalculatorForm] = useState(calculatorInitialState);
  const [resultVisible, setResultVisible] = useState(false);
  const [resultSaving, setResultSaving] = useState(false);
  const [resultError, setResultError] = useState("");
  const [showConversionModal, setShowConversionModal] = useState(false);

  const calculation = useMemo(() => calculateRevenue(calculatorForm), [calculatorForm]);

  useEffect(() => {
    const origin = window.location.origin;
    const canonicalUrl = `${origin}/calculadora`;
    const title = "Calculadora de Faturamento Potencial para Empresas de Extintores | Extintoria";
    const description =
      "Use a calculadora gratuitamente, simule o faturamento da sua operacao e receba os resultados por e-mail.";

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

  useEffect(() => {
    if (!showConversionModal) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowConversionModal(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showConversionModal]);

  useEffect(() => {
    if (showLeadCapture && !savedLead) {
      document.getElementById("calculator-lead-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showLeadCapture, savedLead]);

  function handleLeadChange(event) {
    const { name, value } = event.target;
    setLeadForm((prev) => ({ ...prev, [name]: value }));
    setLeadErrors((prev) => ({ ...prev, [name]: "" }));
    setLeadSubmitError("");
  }

  function handleCalculatorChange(event) {
    const { name, value } = event.target;

    setCalculatorForm((prev) => ({
      ...prev,
      [name]: sanitizeNumericInput(name, value),
    }));

    setResultError("");
  }

  async function handleLeadSubmit(event) {
    event.preventDefault();
    setLeadSubmitError("");

    const validation = validateLeadForm(leadForm);
    setLeadErrors(validation.errors);

    if (!validation.isValid) {
      return;
    }

    if (!isCalculatorLeadEmailConfigured()) {
      setLeadSubmitError("Configure o Web3Forms para receber os leads da calculadora por e-mail.");
      return;
    }

    setLeadSaving(true);

    try {
      const payload = {
        name: leadForm.name.trim(),
        company: leadForm.company.trim(),
        phone: leadForm.phone.trim(),
        email: leadForm.email.trim().toLowerCase(),
        profile: leadForm.profile,
        source: "calculadora_extintoria",
      };

      await sendCalculatorLeadEmail({
        ...payload,
        page: "/calculadora",
        subject: "Nova simulacao da calculadora Extintoria",
        message: buildCalculatorEmailMessage({
          lead: payload,
          calculatorForm,
          calculation,
        }),
      });

      const localLead = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...payload,
      };

      setSavedLead(localLead);
      setShowLeadCapture(false);
      await finalizeResult(localLead);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Nao foi possivel enviar sua simulacao agora.";
      const message = rawMessage.includes("Web3Forms")
        ? "O servico de e-mail da calculadora nao esta configurado. Verifique a chave do Web3Forms."
        : rawMessage;
      setLeadSubmitError(message);
    } finally {
      setLeadSaving(false);
    }
  }

  async function handleResultSubmit() {
    if (!hasMinimumCalculatorData(calculatorForm)) {
      setResultError("Preencha ao menos os dados principais da simulacao para continuar.");
      return;
    }

    if (!savedLead?.id) {
      setShowLeadCapture(true);
      setResultError("");
      return;
    }

    await finalizeResult(savedLead);
  }

  async function finalizeResult(lead) {
    setResultSaving(true);
    setResultError("");

    try {
      if (isSupabaseConfigured) {
        const supabase = getSupabase();
        const payload = {
          lead_id: lead.id,
          clients_count: parseInteger(calculatorForm.customerCount),
          extinguishers_count: parseInteger(calculatorForm.extinguisherCount),
          annual_value_per_extinguisher: parseNumber(calculatorForm.averageAnnualValue),
          renewal_percent: parseNumber(calculatorForm.renewalRate),
          new_contracts_per_month: parseInteger(calculatorForm.newContractsPerMonth),
          average_new_client_ticket: parseNumber(calculatorForm.averageNewClientTicket),
          annual_revenue: calculation.annualPotential,
          monthly_revenue: calculation.monthlyAverage,
          revenue_per_client: calculation.revenuePerCustomer,
          growth_scenario: calculation.growthScenario,
        };

        const { error } = await supabase.from("calculator_results").insert(payload);

        if (error) {
          console.error("Falha ao salvar resultado da calculadora no Supabase:", error.message);
        }
      }

      setResultVisible(true);

      if (sessionStorage.getItem(modalSessionKey) !== "true") {
        setShowConversionModal(true);
        sessionStorage.setItem(modalSessionKey, "true");
      }
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Nao foi possivel salvar o resultado agora.";
      const message = rawMessage || "Nao foi possivel gerar o resultado agora.";
      setResultError(message);
    } finally {
      setResultSaving(false);
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
            <small>Sistema comercial e operacional para empresas de extintores</small>
          </span>
        </a>
      </header>

      <main className="calculator-main">
        <section className="calculator-hero">
          <div className="calculator-hero__copy calculator-hero__copy--compact">
            <span className="calculator-pill">Calculadora comercial gratuita</span>
            <span className="calculator-pill calculator-pill--soft">Simulacao livre</span>
          </div>
        </section>

        <section className="calculator-workspace">
          <div className="calculator-workspace__header">
            <div>
              <span className="calculator-pill">Simulacao livre</span>
              <h2>Calcule seu faturamento potencial</h2>
              <p>Preencha os dados abaixo. O resultado detalhado sera liberado e enviado por e-mail na etapa final.</p>
            </div>
          </div>

          <div className="calculator-workspace__grid">
            <form className="calculator-form-card" onSubmit={(event) => event.preventDefault()}>
              <div className="calculator-form-card__grid">
                <NumericField
                  label="Extintores na carteira"
                  name="extinguisherCount"
                  value={calculatorForm.extinguisherCount}
                  onChange={handleCalculatorChange}
                  placeholder="Ex: 420"
                  min="0"
                />
                <NumericField
                  label="Valor anual por extintor (R$)"
                  name="averageAnnualValue"
                  value={calculatorForm.averageAnnualValue}
                  onChange={handleCalculatorChange}
                  placeholder="Ex: 85"
                  min="0"
                  step="0.01"
                />
                <NumericField
                  label="Novos contratos por mes"
                  name="newContractsPerMonth"
                  value={calculatorForm.newContractsPerMonth}
                  onChange={handleCalculatorChange}
                  placeholder="Ex: 3"
                  min="0"
                />
                <NumericField
                  label="Ticket medio por novo cliente (R$)"
                  name="averageNewClientTicket"
                  value={calculatorForm.averageNewClientTicket}
                  onChange={handleCalculatorChange}
                  placeholder="Ex: 650"
                  min="0"
                  step="0.01"
                />
              </div>

              <details className="calculator-advanced-options">
                <summary>Ajustes avancados opcionais</summary>

                <div className="calculator-advanced-options__grid">
                  <NumericField
                    label="Clientes atendidos"
                    name="customerCount"
                    value={calculatorForm.customerCount}
                    onChange={handleCalculatorChange}
                    placeholder="Ex: 35"
                    min="0"
                  />
                  <NumericField
                    label="Renovacao anual da base (%)"
                    name="renewalRate"
                    value={calculatorForm.renewalRate}
                    onChange={handleCalculatorChange}
                    min="0"
                    max="100"
                  />
                </div>
              </details>

              <small className="calculator-note">
                Preencha os campos principais e clique abaixo para receber o resultado completo por e-mail.
              </small>

              {resultError ? <p className="form-feedback form-feedback--error">{resultError}</p> : null}

              <button type="button" className="calculator-primary-button calculator-primary-button--full" onClick={handleResultSubmit} disabled={resultSaving}>
                {resultSaving ? "Gerando resultado..." : savedLead ? "Atualizar resultado" : "Receber resultado por e-mail"}
              </button>
            </form>

            {savedLead ? (
              <aside className="calculator-summary-card">
                <span className="calculator-summary-card__eyebrow">Estimativa em tempo real</span>
                <div className="calculator-summary-card__amount">{formatCurrency(calculation.annualPotential)}</div>
                <p>de potencial anual considerando a carteira atual e a entrada de novos contratos.</p>

                <div className="calculator-summary-card__metrics">
                  <article>
                    <span>Mensal medio</span>
                    <strong>{formatCurrency(calculation.monthlyAverage)}</strong>
                  </article>
                  <article>
                    <span>Por cliente</span>
                    <strong>{formatCurrency(calculation.revenuePerCustomer)}</strong>
                  </article>
                </div>
              </aside>
            ) : null}
          </div>
        </section>

        {showLeadCapture && !savedLead ? (
          <section className="calculator-results-section" id="calculator-lead-form">
            <div className="calculator-results-section__header">
              <span className="calculator-pill">Ultimo passo</span>
              <h2>Para receber sua simulacao completa, informe seus dados.</h2>
              <p>Vamos enviar o resultado da calculadora por e-mail e manter seu WhatsApp para contato comercial.</p>
            </div>

            <form className="lead-capture-card" onSubmit={handleLeadSubmit}>
              <div className="lead-capture-card__grid">
                <Field
                  label="Nome"
                  name="name"
                  value={leadForm.name}
                  onChange={handleLeadChange}
                  placeholder="Seu nome"
                  error={leadErrors.name}
                  autoComplete="name"
                />
                <Field
                  label="Empresa"
                  name="company"
                  value={leadForm.company}
                  onChange={handleLeadChange}
                  placeholder="Nome da empresa"
                  error={leadErrors.company}
                  autoComplete="organization"
                />
                <Field
                  label="WhatsApp"
                  name="phone"
                  value={leadForm.phone}
                  onChange={handleLeadChange}
                  placeholder="(11) 99999-9999"
                  error={leadErrors.phone}
                  autoComplete="tel"
                />
                <Field
                  label="E-mail"
                  name="email"
                  type="email"
                  value={leadForm.email}
                  onChange={handleLeadChange}
                  placeholder="voce@empresa.com"
                  error={leadErrors.email}
                  autoComplete="email"
                />
                <SelectField
                  label="Qual melhor descreve voce?"
                  name="profile"
                  value={leadForm.profile}
                  onChange={handleLeadChange}
                  error={leadErrors.profile}
                  options={leadProfileOptions}
                />
              </div>

              {leadSubmitError ? <p className="form-feedback form-feedback--error">{leadSubmitError}</p> : null}

              <button type="submit" className="calculator-primary-button calculator-primary-button--full" disabled={leadSaving || resultSaving}>
                {leadSaving ? "Enviando simulacao..." : "Enviar resultado para meu e-mail"}
              </button>
            </form>
          </section>
        ) : null}

        {resultVisible ? (
          <section className="calculator-results-section">
            <div className="calculator-results-section__header">
              <span className="calculator-pill">Resultado estimado</span>
              <h2>Seu potencial estimado de faturamento anual e de {formatCurrency(calculation.annualPotential)}.</h2>
              <p>Essa e uma simulacao comercial inicial para ajudar voce a visualizar o potencial da sua operacao.</p>
            </div>

            <div className="calculator-results-grid">
              <ResultCard title="Faturamento potencial anual" value={formatCurrency(calculation.annualPotential)} highlighted />
              <ResultCard title="Faturamento medio mensal" value={formatCurrency(calculation.monthlyAverage)} />
              <ResultCard title="Receita media por cliente" value={formatCurrency(calculation.revenuePerCustomer)} />
              <ResultCard title="Cenario com 10% de crescimento" value={formatCurrency(calculation.growthScenario)} accent />
            </div>

            <div className="calculator-results-section__footer">
              <p>
                Com clientes, vencimentos, inspecoes e rotina operacional organizados, fica muito mais facil transformar
                esse potencial em faturamento previsivel.
              </p>

              <a className="calculator-secondary-button" href={trialUrl} target="_blank" rel="noreferrer">
                Conhecer o sistema
              </a>
            </div>
          </section>
        ) : null}
      </main>

      {showConversionModal ? (
        <div className="calculator-modal" role="dialog" aria-modal="true" aria-labelledby="calculator-modal-title">
          <button
            type="button"
            className="calculator-modal__backdrop"
            aria-label="Fechar modal"
            onClick={() => setShowConversionModal(false)}
          />

          <div className="calculator-modal__content">
            <button type="button" className="calculator-modal__close" aria-label="Fechar" onClick={() => setShowConversionModal(false)}>
              <CloseIcon />
            </button>

            <span className="calculator-pill">Proximo passo</span>
            <h2 id="calculator-modal-title">Agora imagine esse potencial com sua operacao organizada</h2>
            <p>Controle clientes, vencimentos, inspecoes e rotina operacional em um so lugar com o Extintoria.</p>
            <p className="calculator-modal__support">
              Teste gratuitamente por 7 dias e veja como o sistema pode ajudar sua empresa a crescer com mais
              organizacao e previsibilidade.
            </p>

            <div className="calculator-modal__actions">
              <a className="calculator-primary-button" href={trialUrl} target="_blank" rel="noreferrer">
                Testar o Extintoria por 7 dias gratis
              </a>
              <button type="button" className="calculator-secondary-button calculator-secondary-button--button" onClick={() => setShowConversionModal(false)}>
                Continuar na calculadora
              </button>
            </div>
          </div>
        </div>
      ) : null}
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

function NumericField({ label, ...props }) {
  return (
    <label className="calculator-field">
      <span>{label}</span>
      <input type="number" inputMode="decimal" {...props} />
    </label>
  );
}

function ResultCard({ title, value, highlighted = false, accent = false }) {
  const className = ["calculator-result-card"];

  if (highlighted) className.push("calculator-result-card--highlighted");
  if (accent) className.push("calculator-result-card--accent");

  return (
    <article className={className.join(" ")}>
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
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

function sanitizeNumericInput(name, value) {
  if (value === "") return "";

  const normalizedValue = value.replace(",", ".");
  const parsedValue = Number(normalizedValue);

  if (Number.isNaN(parsedValue)) {
    return "";
  }

  const nonNegativeValue = Math.max(0, parsedValue);

  if (name === "renewalRate") {
    return String(Math.min(100, nonNegativeValue));
  }

  return String(nonNegativeValue);
}

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseInteger(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function hasMinimumCalculatorData(formData) {
  return parseInteger(formData.extinguisherCount) > 0 && parseNumber(formData.averageAnnualValue) > 0;
}

function calculateRevenue(formData) {
  const customerCount = parseInteger(formData.customerCount);
  const extinguisherCount = parseInteger(formData.extinguisherCount);
  const averageAnnualValue = parseNumber(formData.averageAnnualValue);
  const renewalRate = parseNumber(formData.renewalRate);
  const newContractsPerMonth = parseInteger(formData.newContractsPerMonth);
  const averageNewClientTicket = parseNumber(formData.averageNewClientTicket);

  const baseAnnual = extinguisherCount * averageAnnualValue * (renewalRate / 100);
  const newContractsAnnual = newContractsPerMonth * averageNewClientTicket * 12;
  const annualPotential = baseAnnual + newContractsAnnual;
  const monthlyAverage = annualPotential / 12;
  const revenuePerCustomer = customerCount > 0 ? annualPotential / customerCount : 0;
  const growthScenario = annualPotential * 1.1;

  return {
    annualPotential,
    monthlyAverage,
    revenuePerCustomer,
    growthScenario,
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function buildCalculatorEmailMessage({ lead, calculatorForm, calculation }) {
  return [
    "Lead da calculadora Extintoria",
    "",
    `Nome: ${lead.name}`,
    `Empresa: ${lead.company}`,
    `WhatsApp: ${lead.phone}`,
    `E-mail: ${lead.email}`,
    `Perfil: ${lead.profile}`,
    "",
    "Dados informados na simulacao:",
    `Extintores na carteira: ${parseInteger(calculatorForm.extinguisherCount)}`,
    `Valor anual por extintor: ${formatCurrency(parseNumber(calculatorForm.averageAnnualValue))}`,
    `Novos contratos por mes: ${parseInteger(calculatorForm.newContractsPerMonth)}`,
    `Ticket medio por novo cliente: ${formatCurrency(parseNumber(calculatorForm.averageNewClientTicket))}`,
    `Clientes atendidos: ${parseInteger(calculatorForm.customerCount)}`,
    `Renovacao anual da base: ${parseNumber(calculatorForm.renewalRate)}%`,
    "",
    "Resultado da simulacao:",
    `Faturamento potencial anual: ${formatCurrency(calculation.annualPotential)}`,
    `Faturamento medio mensal: ${formatCurrency(calculation.monthlyAverage)}`,
    `Receita media por cliente: ${formatCurrency(calculation.revenuePerCustomer)}`,
    `Cenario com 10% de crescimento: ${formatCurrency(calculation.growthScenario)}`,
  ].join("\n");
}

function updateMetaTag(selector, attribute, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.setAttribute(attribute, value);
  }
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.4l-6.3 6.3-1.41-1.41 6.3-6.29-6.3-6.29L4.29 4.3l6.3 6.29 6.29-6.3 1.42 1.42Z" fill="currentColor" />
    </svg>
  );
}
