export const employeePositions = ["Разнорабочий", "Автомеханик", "Диагност"] as const;

export function normalizeEmployeePosition(value: FormDataEntryValue | string | null | undefined) {
  const position = String(value || "").trim();
  return employeePositions.includes(position as (typeof employeePositions)[number]) ? position : null;
}
