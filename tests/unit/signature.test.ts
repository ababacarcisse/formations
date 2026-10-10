import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { validWebhook } from "@/lib/webhook-signature";
const raw = '{"event":"transaction.success","data":{"id":"fixture"}}',
  timestamp = "1791648000",
  secret = "fixture-not-a-real-secret";
const signature = createHmac("sha256", secret)
  .update(`${timestamp}.${raw}`)
  .digest("hex");
describe("SasPay webhook HMAC", () => {
  it("accepts the exact raw body and signed timestamp", () => {
    expect(
      validWebhook(raw, signature, timestamp, secret, Number(timestamp)),
    ).toBe(true);
  });
  it.each(["", "NaN", "0", "1791648001.2"])(
    "rejects invalid or outdated timestamps %s",
    (stamp) => {
      expect(
        validWebhook(raw, signature, stamp, secret, Number(timestamp)),
      ).toBe(false);
    },
  );
  it("rejects a replay outside the 5 minute window", () => {
    expect(
      validWebhook(raw, signature, timestamp, secret, Number(timestamp) + 301),
    ).toBe(false);
  });
  it("accepts the tolerance boundary", () => {
    expect(
      validWebhook(raw, signature, timestamp, secret, Number(timestamp) + 300),
    ).toBe(true);
  });
  it("rejects changes to body formatting", () => {
    expect(
      validWebhook(raw + " ", signature, timestamp, secret, Number(timestamp)),
    ).toBe(false);
  });
  it("rejects changes to the timestamp", () => {
    expect(
      validWebhook(
        raw,
        signature,
        String(Number(timestamp) + 1),
        secret,
        Number(timestamp),
      ),
    ).toBe(false);
  });
  it.each(["", "abc", "f".repeat(64)])(
    "rejects missing or forged signatures",
    (sig) => {
      expect(validWebhook(raw, sig, timestamp, secret, Number(timestamp))).toBe(
        false,
      );
    },
  );
});
