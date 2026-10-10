import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Import Afrique — Mon business",
    short_name: "Mon business",
    description: "Gestion de stock, ventes et coûts d’import en FCFA",
    start_url: "/app",
    scope: "/app",
    display: "standalone",
    background_color: "#0d1110",
    theme_color: "#ffa351",
    lang: "fr",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
