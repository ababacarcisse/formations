import { describe, it, expect } from "vitest";
import { calendar, escapeHtml } from "@/lib/calendar";
import { csv } from "@/lib/csv";
import { jsonLd, privateMetadata } from "@/lib/seo";
import { participant, meetingDate, safeHttps } from "@/lib/format";
describe("emails, exports and metadata", () => {
  it("generates three UTC events with the correct duration", () => {
    const result = calendar(
      [1, 2, 3].map((n) => ({
        id: `meeting-${n}`,
        meeting_number: n,
        title: `Séance ${n}`,
        starts_at: `2026-11-0${n}T18:00:00Z`,
        duration_minutes: 90,
      })),
      "https://meet.example.test/room",
      new Date("2026-10-10T00:00:00Z"),
    );
    expect(result.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(result).toContain(
      "DTSTART:20261101T180000Z\r\nDTEND:20261101T193000Z",
    );
    expect(result).toContain("LOCATION:https://meet.example.test/room");
  });
  it("folds UTF-8 lines and escapes ICS control characters", () => {
    const result = calendar(
      [
        {
          id: "fixture",
          meeting_number: 1,
          title: "é".repeat(100) + ", test;\ninjection",
          starts_at: "2026-11-01T00:00:00Z",
          duration_minutes: 90,
        },
      ],
      null,
    );
    expect(
      result
        .split("\r\n")
        .every((line) => Buffer.byteLength(line, "utf8") <= 75),
    ).toBe(true);
    expect(result.replace(/\r\n /g, "")).toContain("\\, test\\;\\ninjection");
  });
  it("escapes user content in HTML emails", () => {
    expect(escapeHtml('<script>"test"</script>')).toBe(
      "&lt;script&gt;&quot;test&quot;&lt;/script&gt;",
    );
  });
  it("protects spreadsheets from formula injection", () => {
    const result = csv(
      ["Nom", "Téléphone"],
      [
        ["=HYPERLINK(test)", "+221771234567"],
        ["Client", "normal"],
      ],
    );
    expect(result).toContain('"\'=HYPERLINK(test)"');
    expect(result).toContain('"\'+221771234567"');
    expect(result.startsWith("\ufeff")).toBe(true);
  });
  it("keeps CSV separators and quotes within a cell", () => {
    expect(csv(["Nom"], [[`a;b"c`]])).toContain('"a;b""c"');
  });
  it("prevents script closing tags in JSON-LD", () => {
    const result = jsonLd({ name: "</script><script>bad" });
    expect(result).not.toContain("<");
    expect(JSON.parse(result).name).toBe("</script><script>bad");
  });
  it("never indexes private pages", () => {
    expect(privateMetadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });
  it("formats participant IDs with three digits", () => {
    expect(participant(1)).toBe("001");
    expect(participant(999)).toBe("999");
  });
  it("formats dates in Dakar GMT", () => {
    expect(meetingDate("2026-11-01T18:00:00Z")).toContain("18:00");
  });
  it("rejects unsafe meeting links", () => {
    expect(safeHttps("javascript:alert(1)")).toBeNull();
    expect(safeHttps("http://test.example")).toBeNull();
    expect(safeHttps("https://meet.example.test/")).toBe(
      "https://meet.example.test/",
    );
  });
});
