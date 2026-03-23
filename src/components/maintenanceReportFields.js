export const MAINTENANCE_TYPE_OPTIONS = [
  "MANUTENCAO",
  "RECARGA",
  "TESTE_HIDROSTATICO",
  "SUBSTITUICAO_COMPONENTE",
  "REVISAO",
];

export const MAINTENANCE_STATUS_OPTIONS = [
  "APROVADO",
  "REPROVADO",
  "MANUTENCAO",
  "RECARGA",
  "SUBSTITUICAO",
];

export const initialMaintenanceReportForm = {
  client_id: "",
  extinguisher_id: "",
  inspection_id: "",
  maintenance_date: getCurrentDateTimeInput(),
  service_order_number: "",
  invoice_number: "",
  maintenance_type: "",
  report_status: "",
  maintenance_level: "",
  executor_name: "",
  seal_number: "",
  manufacture_year_snapshot: "",
  last_inspection_year: "",
  gross_weight: "",
  tare_weight: "",
  total_weight: "",
  loss_percentage: "",
  pressure_value: "",
  cylinder_volume: "",
  charge_capacity: "",
  hydrostatic_test_reference: "",
  rejection_pin: false,
  rejection_thread: false,
  rejection_valve: false,
  rejection_pressure_gauge: false,
  rejection_hose: false,
  rejection_reason: "",
  notes: "",
};

export function getCurrentDateTimeInput() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

export function prefillMaintenanceFormFromExtinguisher(extinguisher, currentForm = initialMaintenanceReportForm) {
  if (!extinguisher) return currentForm;

  return {
    ...currentForm,
    maintenance_level: preferCurrent(currentForm.maintenance_level, stringifyNumber(extinguisher.maintenance_level)),
    executor_name: preferCurrent(currentForm.executor_name, extinguisher.maintenance_executor || ""),
    seal_number: preferCurrent(currentForm.seal_number, extinguisher.seal_number || ""),
    manufacture_year_snapshot: preferCurrent(
      currentForm.manufacture_year_snapshot,
      stringifyNumber(extinguisher.manufacture_year),
    ),
    last_inspection_year: preferCurrent(currentForm.last_inspection_year, stringifyNumber(extinguisher.last_inspection_year)),
    gross_weight: preferCurrent(currentForm.gross_weight, stringifyNumber(extinguisher.gross_weight)),
    tare_weight: preferCurrent(currentForm.tare_weight, stringifyNumber(extinguisher.tare_weight)),
    total_weight: preferCurrent(currentForm.total_weight, stringifyNumber(extinguisher.total_weight)),
    loss_percentage: preferCurrent(currentForm.loss_percentage, stringifyNumber(extinguisher.loss_percentage)),
    pressure_value: preferCurrent(currentForm.pressure_value, stringifyNumber(extinguisher.pressure_value)),
    cylinder_volume: preferCurrent(currentForm.cylinder_volume, stringifyNumber(extinguisher.cylinder_volume)),
    charge_capacity: preferCurrent(currentForm.charge_capacity, extinguisher.charge_capacity || ""),
    hydrostatic_test_reference: preferCurrent(
      currentForm.hydrostatic_test_reference,
      extinguisher.hydrostatic_test_reference || "",
    ),
    rejection_pin: currentForm.rejection_pin || Boolean(extinguisher.rejection_pin),
    rejection_thread: currentForm.rejection_thread || Boolean(extinguisher.rejection_thread),
    rejection_valve: currentForm.rejection_valve || Boolean(extinguisher.rejection_valve),
    rejection_pressure_gauge:
      currentForm.rejection_pressure_gauge || Boolean(extinguisher.rejection_pressure_gauge),
    rejection_hose: currentForm.rejection_hose || Boolean(extinguisher.rejection_hose),
    rejection_reason: preferCurrent(currentForm.rejection_reason, extinguisher.rejection_reason || ""),
  };
}

export function buildMaintenanceReportPayload({
  form,
  companyId,
  technicianId,
  selectedExtinguisher,
}) {
  return {
    company_id: companyId,
    client_id: form.client_id,
    unit_id: selectedExtinguisher?.unit_id || null,
    extinguisher_id: form.extinguisher_id,
    inspection_id: form.inspection_id || null,
    technician_id: technicianId || null,
    maintenance_date: normalizeDateTime(form.maintenance_date) || new Date().toISOString(),
    service_order_number: normalizeText(form.service_order_number),
    invoice_number: normalizeText(form.invoice_number),
    maintenance_type: normalizeText(form.maintenance_type),
    report_status: normalizeText(form.report_status),
    maintenance_level: normalizeInteger(form.maintenance_level),
    executor_name: normalizeText(form.executor_name),
    seal_number: normalizeText(form.seal_number),
    extinguisher_code_snapshot: selectedExtinguisher?.internal_code || null,
    serial_number_snapshot: selectedExtinguisher?.serial_number || null,
    extinguisher_type_snapshot: selectedExtinguisher?.extinguisher_type || null,
    capacity_snapshot: selectedExtinguisher?.capacity || null,
    agent_snapshot: selectedExtinguisher?.agent || null,
    manufacturer_snapshot: selectedExtinguisher?.manufacturer || null,
    standard_code_snapshot: selectedExtinguisher?.standard_code || null,
    location_snapshot: selectedExtinguisher?.location_description || null,
    sector_snapshot: selectedExtinguisher?.sector || null,
    manufacture_year_snapshot: normalizeInteger(form.manufacture_year_snapshot),
    last_inspection_year: normalizeInteger(form.last_inspection_year),
    gross_weight: normalizeDecimal(form.gross_weight),
    tare_weight: normalizeDecimal(form.tare_weight),
    total_weight: normalizeDecimal(form.total_weight),
    loss_percentage: normalizeDecimal(form.loss_percentage),
    pressure_value: normalizeDecimal(form.pressure_value),
    cylinder_volume: normalizeDecimal(form.cylinder_volume),
    charge_capacity: normalizeText(form.charge_capacity),
    hydrostatic_test_reference: normalizeText(form.hydrostatic_test_reference),
    rejection_pin: Boolean(form.rejection_pin),
    rejection_thread: Boolean(form.rejection_thread),
    rejection_valve: Boolean(form.rejection_valve),
    rejection_pressure_gauge: Boolean(form.rejection_pressure_gauge),
    rejection_hose: Boolean(form.rejection_hose),
    rejection_reason: normalizeText(form.rejection_reason),
    notes: normalizeText(form.notes),
    updated_at: new Date().toISOString(),
  };
}

export function mapMaintenanceReportToForm(report) {
  return {
    client_id: report.client_id || "",
    extinguisher_id: report.extinguisher_id || "",
    inspection_id: report.inspection_id || "",
    maintenance_date: formatDateTimeForInput(report.maintenance_date),
    service_order_number: report.service_order_number || "",
    invoice_number: report.invoice_number || "",
    maintenance_type: report.maintenance_type || "",
    report_status: report.report_status || "",
    maintenance_level: stringifyNumber(report.maintenance_level),
    executor_name: report.executor_name || "",
    seal_number: report.seal_number || "",
    manufacture_year_snapshot: stringifyNumber(report.manufacture_year_snapshot),
    last_inspection_year: stringifyNumber(report.last_inspection_year),
    gross_weight: stringifyNumber(report.gross_weight),
    tare_weight: stringifyNumber(report.tare_weight),
    total_weight: stringifyNumber(report.total_weight),
    loss_percentage: stringifyNumber(report.loss_percentage),
    pressure_value: stringifyNumber(report.pressure_value),
    cylinder_volume: stringifyNumber(report.cylinder_volume),
    charge_capacity: report.charge_capacity || "",
    hydrostatic_test_reference: report.hydrostatic_test_reference || "",
    rejection_pin: Boolean(report.rejection_pin),
    rejection_thread: Boolean(report.rejection_thread),
    rejection_valve: Boolean(report.rejection_valve),
    rejection_pressure_gauge: Boolean(report.rejection_pressure_gauge),
    rejection_hose: Boolean(report.rejection_hose),
    rejection_reason: report.rejection_reason || "",
    notes: report.notes || "",
  };
}

export function formatDateTimeForInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

function preferCurrent(currentValue, fallbackValue) {
  return currentValue !== undefined && currentValue !== null && currentValue !== "" ? currentValue : fallbackValue;
}

function normalizeText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeDecimal(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeDateTime(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function stringifyNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}
