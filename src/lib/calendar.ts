import type { Meeting } from "@/lib/types";
const escape = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
const stamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
// Fold at <=75 UTF-8 octets, respecting multibyte characters (RFC 5545).
function fold(line: string) {
  let current = "",
    bytes = 0;
  const out: string[] = [];
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 75) {
      out.push(current);
      current = " ";
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n");
}
export function calendar(
  meetings: Meeting[],
  link: string | null,
  now = new Date(),
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Import Afrique//Formation//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const m of meetings) {
    const start = new Date(m.starts_at);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${m.id}@import-afrique`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(new Date(start.getTime() + m.duration_minutes * 60000))}`,
      `SUMMARY:${escape(m.title)}`,
      `DESCRIPTION:${escape("Formation Importer depuis Alibaba en Afrique")}`,
      `LOCATION:${escape(link ?? "Lien communiqué par le formateur")}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
