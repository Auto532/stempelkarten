// HTML-Escaping für User-Input in HTML-Kontexten (Telegram parse_mode HTML,
// E-Mail-Templates). Unescaped kann eingeschleustes HTML Nachrichten fälschen
// oder den Versand scheitern lassen.
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
