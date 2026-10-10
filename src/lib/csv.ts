export function csv(headers: string[], rows: unknown[][]) {
  const cell = (value: unknown) => {
    let s = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return (
    "\ufeff" +
    [headers, ...rows].map((row) => row.map(cell).join(";")).join("\r\n")
  );
}
