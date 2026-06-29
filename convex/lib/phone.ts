export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (!hasPlus) {
    if (digits.startsWith("00")) digits = digits.slice(2);
    else if (digits.startsWith("0")) digits = "49" + digits.slice(1);
  }
  return "+" + digits;
}
