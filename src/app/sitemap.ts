import type { MetadataRoute } from "next";
import { site, isProductionSite } from "@/config/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return isProductionSite
    ? [
        {
          url: new URL("/", site.url).href,
          changeFrequency: "monthly",
          priority: 1,
        },
      ]
    : [];
}
