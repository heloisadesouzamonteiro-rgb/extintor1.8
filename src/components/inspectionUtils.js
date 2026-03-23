export const RESULT_OPTIONS = [
  { value: "APROVADO", label: "APROVADO" },
  { value: "REPROVADO", label: "REPROVADO" },
  { value: "MANUTENCAO", label: "MANUTENCAO" },
  { value: "RECARGA", label: "RECARGA" },
  { value: "SUBSTITUICAO", label: "SUBSTITUICAO" },
];

export const initialInspectionForm = {
  client_id: "",
  extinguisher_id: "",
  tipo_servico: "",
  status_encontrado: "",
  observacoes: "",
  resultado: "",
  proxima_acao: "",
  inspected_at: "",
};

const RESULT_VALUE_MAP = {
  aprovado: "APROVADO",
  APROVADO: "APROVADO",
  conforme: "APROVADO",
  CONFORME: "APROVADO",
  reprovado: "REPROVADO",
  REPROVADO: "REPROVADO",
  nao_conforme: "REPROVADO",
  NAO_CONFORME: "REPROVADO",
  manutencao: "MANUTENCAO",
  MANUTENCAO: "MANUTENCAO",
  recarga: "RECARGA",
  RECARGA: "RECARGA",
  substituicao: "SUBSTITUICAO",
  SUBSTITUICAO: "SUBSTITUICAO",
};

export function normalizeInspectionResult(value) {
  return RESULT_VALUE_MAP[value] || "";
}

export function getInspectionFlags(result) {
  const normalizedResult = normalizeInspectionResult(result);

  return {
    requires_maintenance: normalizedResult === "MANUTENCAO",
    requires_recharge: normalizedResult === "RECARGA",
    requires_replacement: normalizedResult === "SUBSTITUICAO",
  };
}

export function buildInspectionNotes(form) {
  const parts = [
    form.tipo_servico?.trim() ? `Tipo de servico: ${form.tipo_servico.trim()}` : "",
    form.status_encontrado?.trim() ? `Status encontrado: ${form.status_encontrado.trim()}` : "",
    form.proxima_acao?.trim() ? `Proxima acao: ${form.proxima_acao.trim()}` : "",
    form.observacoes?.trim() ? `Observacoes: ${form.observacoes.trim()}` : "",
  ].filter(Boolean);

  return parts.length ? parts.join("\n") : null;
}

function getNoteValue(lines, labels) {
  for (const line of lines) {
    const match = labels.find((label) => line.toLowerCase().startsWith(label));
    if (match) {
      return line.slice(match.length).trim();
    }
  }

  return "";
}

export function parseInspectionNotes(notes) {
  const text = (notes || "").trim();
  if (!text) {
    return {
      tipo_servico: "",
      status_encontrado: "",
      proxima_acao: "",
      observacoes: "",
    };
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  return {
    tipo_servico: getNoteValue(lines, ["tipo de servico:", "tipo de servico:"]),
    status_encontrado: getNoteValue(lines, ["status encontrado:"]),
    proxima_acao: getNoteValue(lines, ["proxima acao:", "proxima acao:"]),
    observacoes: getNoteValue(lines, ["observacoes:", "observacoes:"]),
  };
}

export function formatInspectionDateTimeForInput(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}
