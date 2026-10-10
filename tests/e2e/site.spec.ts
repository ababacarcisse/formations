import { test, expect } from "@playwright/test";
test("server-rendered sales page, canonical metadata and structured Course", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    /https:\/\/www\.formations\.cissesolutions\.cloud\/?$/,
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
    "content",
    "website",
  );
  const course = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent())!,
  );
  expect(course["@type"]).toBe("Course");
  expect(course.hasCourseInstance.offers.priceCurrency).toBe("XOF");
  await page
    .getByText("Peut-on commander sur Alibaba depuis l’Afrique ?", {
      exact: false,
    })
    .click();
  await expect(page.locator("details").first()).toHaveAttribute("open", "");
});
test("mobile has no horizontal overflow and sticky CTA", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".mobile-cta")).toBeVisible();
});
test("unconfigured checkout cannot invent a session or a purchase", async ({
  page,
  request,
}) => {
  await page.goto("/checkout");
  await expect(
    page.getByText("Aucune session ouverte pour le moment."),
  ).toBeVisible();
  const response = await request.post("/api/checkout", {
    headers: { Origin: "http://127.0.0.1:3100" },
    data: {
      attempt_id: "11111111-1111-4111-8111-111111111111",
      session_id: "22222222-2222-4222-8222-222222222222",
      full_name: "Test Client",
      email: "test@example.test",
      phone: "+221771234567",
      website: "",
    },
  });
  expect(response.status()).toBe(503);
});
test("private pages and arbitrary order ID do not disclose participant details", async ({
  page,
  request,
}) => {
  await page.goto(
    "/paiement/succes?order=11111111-1111-4111-8111-111111111111",
  );
  await expect(page.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(page.getByText("Confirmation privée")).toBeVisible();
  const response = await request.get(
    "/api/orders/11111111-1111-4111-8111-111111111111",
  );
  expect(response.status()).toBe(403);
  expect(await response.text()).not.toContain("participant_number");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/connexion/);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app\/connexion/);
});
test("legal pages remain noindex until completed", async ({ page }) => {
  for (const slug of [
    "mentions-legales",
    "cgv",
    "confidentialite",
    "remboursement",
  ]) {
    await page.goto("/" + slug);
    await expect(page.locator("meta[name=robots]")).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(page.locator("h1")).toHaveCount(1);
  }
});
test("non-www domain redirects permanently with path and query", async ({
  request,
}) => {
  const response = await request.get("/checkout?session=test", {
    headers: { Host: "formations.cissesolutions.cloud" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe(
    "https://www.formations.cissesolutions.cloud/checkout?session=test",
  );
});
test("social image and PWA assets are served", async ({ request }) => {
  const image = await request.get("/opengraph-image");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  const manifest = await request.get("/manifest.webmanifest");
  expect((await manifest.json()).start_url).toBe("/app");
  expect((await request.get("/app-icon-192.png")).status()).toBe(200);
});
test("robots and sitemap use the canonical production domain", async ({
  request,
}) => {
  const robots = await request.get("/robots.txt"),
    sitemap = await request.get("/sitemap.xml");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(
    "https://www.formations.cissesolutions.cloud/sitemap.xml",
  );
  expect(sitemap.status()).toBe(200);
  const text = await sitemap.text();
  expect(text).not.toContain("/checkout");
  expect(text).not.toContain("/admin");
});
