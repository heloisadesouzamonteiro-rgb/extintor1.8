export function formatInspectionNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "Sem numero";
  }

  return `Nº ${value}`;
}
