export const initialExtinguisherForm = {
  client_id: "",
  unit_id: "",
  patrimonio_codigo: "",
  numero_serie: "",
  tipo: "",
  capacidade: "",
  agente: "",
  fabricante: "",
  codigo_projeto: "",
  norma: "",
  localizacao: "",
  setor: "",
  fabricacao: "",
  ano_fabricacao: "",
  validade: "",
  ultima_manutencao: "",
  ultimo_ensaio: "",
  nivel_manutencao: "",
  peso_bruto: "",
  peso_tara: "",
  peso_total: "",
  perda_percentual: "",
  pressao: "",
  volume: "",
  capacidade_carga: "",
  executante_manutencao: "",
  selo_inmetro: "",
  ensaio_hidrostatico_referencia: "",
  reprovacao_pinos: false,
  reprovacao_rosca: false,
  reprovacao_valvula: false,
  reprovacao_indicador_pressao: false,
  reprovacao_mangueira: false,
  motivo_reprovacao: "",
  status: "ativo",
  observacoes: "",
};

export function formatDateForInput(value) {
  if (!value) return "";
  if (typeof value === "string" && value.length >= 10) {
    return value.slice(0, 10);
  }
  return "";
}

export function buildExtinguisherPayload(form, companyId) {
  return {
    ...(companyId ? { company_id: companyId } : {}),
    ...(form.client_id !== undefined ? { client_id: form.client_id } : {}),
    ...(form.unit_id !== undefined ? { unit_id: form.unit_id || null } : {}),
    internal_code: normalizeText(form.patrimonio_codigo),
    serial_number: normalizeText(form.numero_serie),
    extinguisher_type: normalizeText(form.tipo),
    capacity: normalizeText(form.capacidade),
    agent: normalizeText(form.agente),
    manufacturer: normalizeText(form.fabricante),
    project_code: normalizeText(form.codigo_projeto),
    standard_code: normalizeText(form.norma),
    location_description: normalizeText(form.localizacao),
    sector: normalizeText(form.setor),
    manufacture_date: normalizeDate(form.fabricacao),
    manufacture_year: normalizeInteger(form.ano_fabricacao),
    load_expiration_date: normalizeDate(form.validade),
    hydrostatic_test_date: normalizeDate(form.ultima_manutencao),
    last_inspection_year: normalizeInteger(form.ultimo_ensaio),
    next_inspection_due: normalizeDate(form.proxima_manutencao),
    maintenance_level: normalizeInteger(form.nivel_manutencao),
    gross_weight: normalizeDecimal(form.peso_bruto),
    tare_weight: normalizeDecimal(form.peso_tara),
    total_weight: normalizeDecimal(form.peso_total),
    loss_percentage: normalizeDecimal(form.perda_percentual),
    pressure_value: normalizeDecimal(form.pressao),
    cylinder_volume: normalizeDecimal(form.volume),
    charge_capacity: normalizeText(form.capacidade_carga),
    maintenance_executor: normalizeText(form.executante_manutencao),
    seal_number: normalizeText(form.selo_inmetro),
    hydrostatic_test_reference: normalizeText(form.ensaio_hidrostatico_referencia),
    rejection_pin: Boolean(form.reprovacao_pinos),
    rejection_thread: Boolean(form.reprovacao_rosca),
    rejection_valve: Boolean(form.reprovacao_valvula),
    rejection_pressure_gauge: Boolean(form.reprovacao_indicador_pressao),
    rejection_hose: Boolean(form.reprovacao_mangueira),
    rejection_reason: normalizeText(form.motivo_reprovacao),
    status: form.status || "ativo",
    notes: normalizeText(form.observacoes),
  };
}

export function mapExtinguisherToForm(extintor) {
  return {
    patrimonio_codigo: extintor.internal_code || "",
    numero_serie: extintor.serial_number || "",
    tipo: extintor.extinguisher_type || "",
    capacidade: extintor.capacity || "",
    agente: extintor.agent || "",
    fabricante: extintor.manufacturer || "",
    codigo_projeto: extintor.project_code || "",
    norma: extintor.standard_code || "",
    localizacao: extintor.location_description || "",
    setor: extintor.sector || "",
    fabricacao: formatDateForInput(extintor.manufacture_date),
    ano_fabricacao: stringifyNumber(extintor.manufacture_year),
    validade: formatDateForInput(extintor.load_expiration_date),
    ultima_manutencao: formatDateForInput(extintor.hydrostatic_test_date),
    ultimo_ensaio: stringifyNumber(extintor.last_inspection_year),
    proxima_manutencao: formatDateForInput(extintor.next_inspection_due),
    nivel_manutencao: stringifyNumber(extintor.maintenance_level),
    peso_bruto: stringifyNumber(extintor.gross_weight),
    peso_tara: stringifyNumber(extintor.tare_weight),
    peso_total: stringifyNumber(extintor.total_weight),
    perda_percentual: stringifyNumber(extintor.loss_percentage),
    pressao: stringifyNumber(extintor.pressure_value),
    volume: stringifyNumber(extintor.cylinder_volume),
    capacidade_carga: extintor.charge_capacity || "",
    executante_manutencao: extintor.maintenance_executor || "",
    selo_inmetro: extintor.seal_number || "",
    ensaio_hidrostatico_referencia: extintor.hydrostatic_test_reference || "",
    reprovacao_pinos: Boolean(extintor.rejection_pin),
    reprovacao_rosca: Boolean(extintor.rejection_thread),
    reprovacao_valvula: Boolean(extintor.rejection_valve),
    reprovacao_indicador_pressao: Boolean(extintor.rejection_pressure_gauge),
    reprovacao_mangueira: Boolean(extintor.rejection_hose),
    motivo_reprovacao: extintor.rejection_reason || "",
    status: extintor.status || "ativo",
    observacoes: extintor.notes || "",
  };
}

function normalizeText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeDate(value) {
  return value || null;
}

function normalizeInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = Number.parseInt(String(value), 10);
  return Number.isNaN(normalized) ? null : normalized;
}

function normalizeDecimal(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = Number.parseFloat(String(value).replace(",", "."));
  return Number.isNaN(normalized) ? null : normalized;
}

function stringifyNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}
