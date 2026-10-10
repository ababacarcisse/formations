import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ serviceDb: () => ({}) }));
import { sameOrigin } from "@/lib/http";
describe("origin validation behind the deployment proxy", () => {
  it("uses the trusted request host rather than Next's internal URL", () => {
    const request = new Request("http://localhost:3000/api/checkout", {
      headers: {
        host: "www.formations.cissesolutions.cloud",
        origin: "https://www.formations.cissesolutions.cloud",
        "x-forwarded-proto": "https",
      },
    });
    expect(() => sameOrigin(request)).not.toThrow();
  });
  it("rejects an origin from a different host", () => {
    const request = new Request(
      "https://www.formations.cissesolutions.cloud/api/checkout",
      { headers: { origin: "https://attacker.example.test" } },
    );
    expect(() => sameOrigin(request)).toThrow("Origine non autorisée");
  });
  it("rejects a downgrade from HTTPS", () => {
    const request = new Request(
      "https://www.formations.cissesolutions.cloud/api/checkout",
      { headers: { origin: "http://www.formations.cissesolutions.cloud" } },
    );
    expect(() => sameOrigin(request)).toThrow("Origine non autorisée");
  });
  it("rejects a missing Origin", () => {
    expect(() =>
      sameOrigin(
        new Request("https://www.formations.cissesolutions.cloud/api/checkout"),
      ),
    ).toThrow();
  });
});
