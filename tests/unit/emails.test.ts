import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  updates: [] as { table: string; values: Record<string, unknown> }[],
  type: "confirmation",
  orderStatus: "success",
  claimed: true,
  manual: false,
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  serviceDb: () => ({
    rpc: vi.fn().mockResolvedValue({ data: mocks.claimed, error: null }),
    from: (table: string) => {
      const row =
        table === "email_logs"
          ? [
              {
                id: "fixture-log",
                order_id: "fixture-order",
                type: mocks.type,
                status: "queued",
                attempts: 0,
              },
            ]
          : table === "orders"
            ? {
                id: "fixture-order",
                session_id: "fixture-session",
                full_name: '<script>alert("x")</script>',
                email: "buyer@example.test",
                status: mocks.orderStatus,
                manual_review: mocks.manual,
                participant_number: 1,
              }
            : table === "training_sessions"
              ? {
                  title: "Formation",
                  meeting_link: "https://meet.example.test/private",
                  whatsapp_group_link: "https://chat.whatsapp.com/private",
                }
              : [1, 2, 3].map((n) => ({
                  id: `meeting-${n}`,
                  meeting_number: n,
                  title: `Séance ${n}`,
                  starts_at: `2026-11-0${n}T18:00:00Z`,
                  duration_minutes: 90,
                }));
      const query = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: () => Promise.resolve({ data: row, error: null }),
        update: (values: Record<string, unknown>) => {
          mocks.updates.push({ table, values });
          return { eq: () => Promise.resolve({ error: null }) };
        },
        then: (resolve: (value: unknown) => void) =>
          resolve({ data: row, error: null }),
      };
      return query;
    },
  }),
}));
import { drainEmails } from "@/lib/emails";
beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_fixture_not_real");
  vi.stubEnv("EMAIL_FROM", "Formation <sender@example.test>");
  mocks.send.mockReset();
  mocks.send.mockResolvedValue({
    data: { id: "provider-fixture" },
    error: null,
  });
  mocks.updates.length = 0;
  mocks.type = "confirmation";
  mocks.orderStatus = "success";
  mocks.claimed = true;
  mocks.manual = false;
});
afterEach(() => vi.unstubAllEnvs());
describe("durable email outbox", () => {
  it("sends confirmation, private links, padded participant number and three-event ICS", async () => {
    expect((await drainEmails()).sent).toBe(1);
    const [email, options] = mocks.send.mock.calls[0];
    expect(email.subject).toBe("Ton inscription est confirmée");
    expect(email.html).toContain("001");
    expect(email.html).toContain("Heure de Dakar/Abidjan (GMT)");
    expect(email.html).not.toContain("<script>alert");
    expect(email.html).toContain("meet.example.test/private");
    expect(email.html).toContain("chat.whatsapp.com/private");
    expect(email.attachments[0].filename).toBe("formation.ics");
    expect(
      email.attachments[0].content.toString().match(/BEGIN:VEVENT/g),
    ).toHaveLength(3);
    expect(options).toEqual({ idempotencyKey: "email-fixture-log" });
    expect(mocks.updates.at(-1)?.values.status).toBe("sent");
  });
  it("does not throw when Resend fails, and records a retryable failure", async () => {
    mocks.send.mockRejectedValue(new Error("network"));
    expect((await drainEmails()).sent).toBe(0);
    expect(mocks.updates.at(-1)?.values.status).toBe("failed");
  });
  it("does not send a confirmation to an oversold order", async () => {
    mocks.manual = true;
    await drainEmails();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.updates.at(-1)?.values.status).toBe("failed");
  });
  it("does not send a failure reminder after the payment has succeeded", async () => {
    mocks.type = "retry";
    await drainEmails();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.updates.at(-1)?.values.status).toBe("skipped");
  });
  it("keeps a manual resend as a confirmation with ICS", async () => {
    mocks.type = "confirmation:manual:fixture";
    await drainEmails();
    expect(mocks.send.mock.calls[0][0].subject).toBe(
      "Ton inscription est confirmée",
    );
    expect(mocks.send.mock.calls[0][0].attachments).toHaveLength(1);
  });
  it("does not send an already claimed email twice", async () => {
    mocks.claimed = false;
    await drainEmails();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("preserves queued work when configuration is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await drainEmails()).toEqual({
      sent: 0,
      configurationMissing: true,
    });
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
