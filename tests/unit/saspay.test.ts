import { describe, it, expect, vi } from "vitest";
import { SasPayClient, matchesPayment } from "@/lib/saspay";
const id = "11111111-1111-4111-8111-111111111111",
  paymentId = "22222222-2222-4222-8222-222222222222";
const payment = {
  id: paymentId,
  status: "SUCCESS" as const,
  requested_amount: "10000.00",
  currency: "XOF",
  flow_direction: "INBOUND" as const,
  transaction_type: "PAIEMENT" as const,
};
const reply = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data, code: 200 }));
describe("SasPay official API adapter", () => {
  it("reads checkout_url from the envelope and sends the documented payload", async () => {
    const mock = vi.fn<typeof fetch>().mockResolvedValue(
      reply({
        id,
        checkout_url: "https://pay.saspay.me/checkout/test",
        transaction: null,
      }),
    );
    const api = new SasPayClient("sk_test_fixture_not_a_real_key", mock);
    const result = await api.createCheckout(
      {
        amount: "10000.00",
        currency: "XOF",
        description: "Formation",
        customer_email: "buyer@example.test",
        customer_name: "Acheteur",
        customer_phone: "+221771234567",
        return_url:
          "https://www.formations.cissesolutions.cloud/paiement/succes?order=test",
        metadata: { order_id: id },
        expires_at: "2026-11-01T12:00:00Z",
      },
      id,
    );
    expect(result.checkout_url).toContain("pay.saspay.me");
    const [url, options] = mock.mock.calls[0];
    expect(url).toBe("https://api.saspay.me/api/v1/checkout-sessions/");
    expect(options?.headers).toMatchObject({ "Idempotency-Key": id });
    expect(JSON.parse(String(options?.body))).toMatchObject({
      amount: "10000.00",
      metadata: { order_id: id },
    });
  });
  it("resolves the payment ID through the checkout status endpoint", async () => {
    const mock = vi.fn<typeof fetch>().mockResolvedValue(
      reply({
        id,
        status: "PAID",
        transaction_id: paymentId,
        transaction_status: "SUCCESS",
      }),
    );
    expect(
      (await new SasPayClient("fixture", mock).checkoutStatus(id))
        .transaction_id,
    ).toBe(paymentId);
    expect(mock.mock.calls[0][0]).toContain(`/checkout-sessions/${id}/status/`);
  });
  it("uses requested_amount instead of net_amount after fees", async () => {
    const mock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply({ ...payment, net_amount: "9700.00" }));
    const p = await new SasPayClient("fixture", mock).verify(paymentId);
    expect(
      matchesPayment(
        p,
        { amount: 10000, currency: "XOF", saspay_payment_id: null },
        paymentId,
      ),
    ).toBe(true);
  });
  it.each([
    { ...payment, requested_amount: "1000" },
    { ...payment, currency: "XAF" },
    { ...payment, id },
  ])("rejects a different amount, currency or transaction", (p) => {
    expect(
      matchesPayment(
        p,
        { amount: 10000, currency: "XOF", saspay_payment_id: null },
        paymentId,
      ),
    ).toBe(false);
  });
  it("rejects a payment already linked to another ID", () => {
    expect(
      matchesPayment(
        payment,
        { amount: 10000, currency: "XOF", saspay_payment_id: id },
        paymentId,
      ),
    ).toBe(false);
  });
  it("does not accept outbound transactions", async () => {
    const mock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(reply({ ...payment, flow_direction: "OUTBOUND" }));
    await expect(
      new SasPayClient("fixture", mock).verify(paymentId),
    ).rejects.toMatchObject({ code: "INVALID_DATA" });
  });
  it("rejects an invalid envelope", async () => {
    const mock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: "declined" },
          code: 422,
        }),
      ),
    );
    await expect(
      new SasPayClient("fixture", mock).verify(paymentId),
    ).rejects.toMatchObject({ code: "INVALID_ENVELOPE" });
  });
  it("handles HTTP failure", async () => {
    const mock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("Unavailable", { status: 503 }));
    await expect(
      new SasPayClient("fixture", mock).verify(paymentId),
    ).rejects.toMatchObject({ code: "HTTP_503" });
  });
  it("rejects a redirected checkout on an unexpected host", async () => {
    const mock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        reply({ id, checkout_url: "https://attacker.example.test/pay" }),
      );
    await expect(
      new SasPayClient("fixture", mock).createCheckout(
        {
          amount: "10000.00",
          currency: "XOF",
          description: "Formation",
          customer_email: "buyer@example.test",
          customer_name: "Buyer",
          customer_phone: "+221771234567",
          return_url: "https://www.formations.cissesolutions.cloud/",
          metadata: { order_id: id },
          expires_at: "2026-11-01T00:00:00Z",
        },
        id,
      ),
    ).rejects.toMatchObject({ code: "INVALID_DATA" });
  });
});
