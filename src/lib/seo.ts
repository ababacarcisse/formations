import type { Metadata } from "next";
import { site, isProductionSite } from "@/config/site";
export function publicMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    robots: { index: isProductionSite, follow: true },
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
      locale: "fr_FR",
      siteName: site.name,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "Formation Alibaba en Afrique — 3 séances pratiques en direct",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}
export const privateMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};
export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
