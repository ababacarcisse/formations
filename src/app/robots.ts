import type { MetadataRoute } from "next";
import { site, isProductionSite } from "@/config/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: isProductionSite
      ? {
          userAgent: "*",
          allow: "/",
          disallow: ["/admin", "/app", "/checkout", "/paiement", "/api"],
        }
      : { userAgent: "*", disallow: "/" },
    sitemap: new URL("/sitemap.xml", site.url).href,
  };
}
