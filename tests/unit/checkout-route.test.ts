import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  create: vi.fn(),
  authorize: vi.fn(),
  remember: vi.fn(),
  enabled: true,
}));
vi.mock("@/lib/env", () => ({ paymentsEnabled: () => mocks.enabled }));
vi.mock("@/lib/supabase/server", () => ({
  serviceDb: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
vi.mock("@/lib/saspay-server", () => ({
  saspay: () => ({ createCheckout: mocks.create }),
}));
vi.mock("@/lib/order-access", () => ({
  newOrderAccess: () => "fixture-access-token",
  accessHash: (s: string) => createHash("sha256").update(s).digest("hex"),
  rememberOrder: mocks.remember,
  authorizedOrder: mocks.authorize,
}));
import { POST } from "@/app/api/checkout/route";
const id = "11111111-1111-4111-8111-111111111111",
  sid = "22222222-2222-4222-8222-222222222222",
  attempt = "33333333-3333-4333-8333-333333333333";
const input = {
  attempt_id: attempt,
  session_id: sid,
  full_name: "Test Client",
  email: "buyer@example.test",
  phone: "+221771234567",
  website: "",
};
function request(
  origin = "https://www.formations.cissesolutions.cloud",
  data: unknown = input,
) {
  return new Request(
    "https://www.formations.cissesolutions.cloud/api/checkout",
    {
      method: "POST",
      headers: {
        Origin: origin,
        Host: "www.formations.cissesolutions.cloud",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.enabled = true;
  mocks.rpc.mockImplementation(async (name: string) =>
    name === "check_rate_limit"
      ? { data: true, error: null }
      : { data: id, error: null },
  );
  const query = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi
      .fn()
      .mockResolvedValue({
        data: {
          id,
          access_token_hash: createHash("sha256")
            .update("fixture-access-token")
            .digest("hex"),
        },
        error: null,
      }),
    then: (resolve: (v: unknown) => void) => resolve({ error: null }),
  };
  mocks.from.mockReturnValue(query);
  mocks.create.mockResolvedValue({
    id: sid,
    checkout_url: "https://pay.saspay.me/checkout/fixture",
  });
  mocks.authorize.mockResolvedValue({
    id,
    checkout_url: "https://pay.saspay.me/checkout/existing",
  });
});
describe("checkout API", () => {
  it("creates the order before a provider checkout and returns only checkout_url", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      checkout_url: "https://pay.saspay.me/checkout/fixture",
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_training_order",
      expect.objectContaining({
        p_key: attempt,
        p_amount: 10000,
        p_session: sid,
      }),
    );
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "10000.00",
        return_url: `https://www.formations.cissesolutions.cloud/paiement/succes?order=${id}`,
        metadata: { order_id: id },
      }),
      attempt,
    );
  });
  it("rejects cross-origin posts", async () => {
    expect((await POST(request("https://attacker.example.test"))).status).toBe(
      403,
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects a honeypot submission", async () => {
    expect(
      (await POST(request(undefined, { ...input, website: "bot" }))).status,
    ).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects phone numbers without country prefix", async () => {
    expect(
      (await POST(request(undefined, { ...input, phone: "771234567" }))).status,
    ).toBe(400);
  });
  it("leaves sales closed until configured", async () => {
    mocks.enabled = false;
    expect((await POST(request())).status).toBe(503);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("never creates a provider checkout when the session is full", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "check_rate_limit"
        ? { data: true, error: null }
        : { data: null, error: { message: "full" } },
    );
    expect((await POST(request())).status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("replays an existing local intention without calling SasPay again", async () => {
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({
          data: { id, access_token_hash: "previous-browser-token" },
          error: null,
        }),
    });
    const response = await POST(request());
    expect(await response.json()).toEqual({
      checkout_url: "https://pay.saspay.me/checkout/existing",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not reuse an expired provider checkout", async () => {
    mocks.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({
          data: { id, access_token_hash: "previous" },
          error: null,
        }),
    });
    mocks.authorize.mockResolvedValue({
      id,
      status: "expired",
      checkout_url: "https://pay.saspay.me/checkout/expired",
    });
    expect((await POST(request())).status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not retry a provider call after a timeout", async () => {
    mocks.create.mockRejectedValue(new Error("timeout"));
    expect((await POST(request())).status).toBe(503);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).not.toHaveBeenCalledWith(
      "fail_training_order",
      expect.anything(),
    );
  });
});
