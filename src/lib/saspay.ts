// Official contract reviewed 2026-10-10: docs.saspay.me/llms.txt + OpenAPI.
import { z } from "zod";
const uuid = z.uuid();
export const checkoutSchema = z.object({
  id: uuid,
  checkout_url: z
    .url()
    .refine(
      (value) =>
        new URL(value).protocol === "https:" &&
        new URL(value).hostname === "pay.saspay.me",
    ),
  transaction: uuid.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
const statusSchema = z.object({
  id: uuid,
  status: z.enum(["PENDING", "PAID", "EXPIRED", "CANCELLED"]),
  transaction_id: uuid.nullable().optional(),
  transaction_status: z.string().nullable().optional(),
});
const decimal = z.union([
  z.string().regex(/^\d+(\.\d{1,2})?$/),
  z.number().finite().nonnegative(),
]);
const verificationSchema = z.object({
  id: uuid,
  status: z.enum(["SUCCESS", "PENDING", "FAILED", "CANCELLED"]),
  requested_amount: decimal,
  currency: z.string().length(3),
  flow_direction: z.literal("INBOUND"),
  transaction_type: z.literal("PAIEMENT"),
});
const listSchema = z.object({
  count: z.number().int(),
  next: z.string().nullable(),
  results: z.array(checkoutSchema),
});
export type VerifiedPayment = z.infer<typeof verificationSchema>;
export class SasPayError extends Error {
  constructor(public code: string) {
    super("Le service de paiement est indisponible.");
  }
}
export class SasPayClient {
  constructor(
    private key: string,
    private fetcher: typeof fetch = fetch,
  ) {}
  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    init: RequestInit = {},
  ): Promise<T> {
    const res = await this.fetcher(`https://api.saspay.me/api/v1/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!res.ok) throw new SasPayError(`HTTP_${res.status}`);
    const envelope = z
      .object({ success: z.boolean(), data: z.unknown(), code: z.number() })
      .safeParse(await res.json());
    if (!envelope.success || !envelope.data.success)
      throw new SasPayError("INVALID_ENVELOPE");
    const parsed = schema.safeParse(envelope.data.data);
    if (!parsed.success) throw new SasPayError("INVALID_DATA");
    return parsed.data;
  }
  createCheckout(
    input: {
      amount: string;
      currency: "XOF";
      description: string;
      customer_email: string;
      customer_name: string;
      customer_phone: string;
      return_url: string;
      metadata: { order_id: string };
      expires_at: string;
    },
    key: string,
  ) {
    // SasPay ignores this header for hosted checkout. Local attempt deduplication is required.
    return this.request("checkout-sessions/", checkoutSchema, {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(input),
    });
  }
  checkoutStatus(id: string) {
    return this.request(
      `checkout-sessions/${encodeURIComponent(id)}/status/`,
      statusSchema,
    );
  }
  listCheckouts(page: number) {
    return this.request(
      `checkout-sessions/?page=${page}&page_size=100`,
      listSchema,
    );
  }
  verify(id: string) {
    return this.request(
      `payments/${encodeURIComponent(id)}/verify/`,
      verificationSchema,
    );
  }
}
export function matchesPayment(
  payment: VerifiedPayment,
  order: { amount: number; currency: string; saspay_payment_id: string | null },
  linkedPayment: string,
) {
  return (
    Number(payment.requested_amount) === Number(order.amount) &&
    payment.currency === order.currency &&
    payment.id === linkedPayment &&
    (!order.saspay_payment_id || payment.id === order.saspay_payment_id)
  );
}
