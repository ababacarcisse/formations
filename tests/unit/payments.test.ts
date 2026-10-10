import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Order } from "@/lib/types";
const stubs = vi.hoisted(() => ({
  status: vi.fn(),
  verify: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ paymentsEnabled: () => true }));
vi.mock("@/lib/saspay-server", () => ({
  saspay: () => ({ checkoutStatus: stubs.status, verify: stubs.verify }),
}));
vi.mock("@/lib/supabase/server", () => ({
  serviceDb: () => ({ rpc: stubs.rpc, from: stubs.from }),
}));
import { verifyPayment } from "@/lib/payments";
const sid = "11111111-1111-4111-8111-111111111111",
  pid = "22222222-2222-4222-8222-222222222222",
  oid = "33333333-3333-4333-8333-333333333333";
const order = {
  id: oid,
  saspay_session_id: sid,
  saspay_payment_id: null,
  status: "pending",
  amount: 10000,
  currency: "XOF",
} as Order;
beforeEach(() => {
  vi.resetAllMocks();
  stubs.status.mockResolvedValue({
    id: sid,
    status: "PAID",
    transaction_id: pid,
  });
  stubs.verify.mockResolvedValue({
    id: pid,
    status: "SUCCESS",
    requested_amount: "10000.00",
    currency: "XOF",
    flow_direction: "INBOUND",
    transaction_type: "PAIEMENT",
  });
  stubs.rpc.mockResolvedValue({
    data: { ...order, status: "success", participant_number: 1 },
    error: null,
  });
  const query = {
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockResolvedValue({ error: null }),
    single: vi.fn().mockResolvedValue({ data: order, error: null }),
  };
  stubs.from.mockReturnValue(query);
});
describe("server-authoritative payment confirmation", () => {
  it("confirms only after verifying the linked transaction and amount", async () => {
    const result = await verifyPayment(order);
    expect(result.status).toBe("success");
    expect(stubs.verify).toHaveBeenCalledWith(pid);
    expect(stubs.rpc).toHaveBeenCalledWith("confirm_training_order", {
      p_order: oid,
      p_payment: pid,
    });
  });
  it("rejects a forged event payment ID", async () => {
    await expect(verifyPayment(order, oid)).rejects.toMatchObject({
      status: 409,
    });
    expect(stubs.rpc).not.toHaveBeenCalledWith(
      "confirm_training_order",
      expect.anything(),
    );
  });
  it("rejects a wrong amount before confirmation", async () => {
    stubs.verify.mockResolvedValue({
      id: pid,
      status: "SUCCESS",
      requested_amount: "1000",
      currency: "XOF",
    });
    await expect(verifyPayment(order)).rejects.toMatchObject({ status: 409 });
    expect(stubs.rpc).not.toHaveBeenCalledWith(
      "confirm_training_order",
      expect.anything(),
    );
  });
  it("preserves pending when no transaction exists", async () => {
    stubs.status.mockResolvedValue({
      id: sid,
      status: "PENDING",
      transaction_id: null,
    });
    expect((await verifyPayment(order)).status).toBe("pending");
    expect(stubs.verify).not.toHaveBeenCalled();
    expect(stubs.rpc).not.toHaveBeenCalledWith(
      "confirm_training_order",
      expect.anything(),
    );
  });
  it("marks expired sessions without inventing a transaction", async () => {
    stubs.status.mockResolvedValue({
      id: sid,
      status: "EXPIRED",
      transaction_id: null,
    });
    await verifyPayment(order);
    expect(stubs.rpc).toHaveBeenCalledWith(
      "fail_training_order",
      expect.objectContaining({ p_status: "expired" }),
    );
  });
  it("uses the failure SQL function for a refused payment", async () => {
    stubs.verify.mockResolvedValue({
      id: pid,
      status: "FAILED",
      requested_amount: "10000",
      currency: "XOF",
    });
    await verifyPayment(order);
    expect(stubs.rpc).toHaveBeenCalledWith(
      "fail_training_order",
      expect.objectContaining({ p_order: oid, p_status: "failed" }),
    );
    expect(stubs.rpc).not.toHaveBeenCalledWith(
      "confirm_training_order",
      expect.anything(),
    );
  });
});
