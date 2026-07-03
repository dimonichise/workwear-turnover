export const statusNames: Record<string, string> = {
  active: "работает",
  fired: "уволен",
  archived: "архив",
  with_employee: "у сотрудника",
  in_laundry: "в стирке",
  returned_after_firing: "возвращено",
  not_returned: "не возвращено",
  unknown: "требует проверки",
  draft: "черновик",
  ready: "готово к отправке",
  sent: "проведено",
  error: "ошибка",
  cancelled: "отменено",
  received_from_laundry: "принято из стирки",
  sent_to_laundry: "отдано в стирку"
};

export function ruDate(date: Date | string) {
  return new Intl.DateTimeFormat("ru-RU").format(new Date(date));
}

export function fileDate(date: Date | string) {
  return ruDate(date).replaceAll("/", ".");
}

export function money(value: unknown) {
  return `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
}
