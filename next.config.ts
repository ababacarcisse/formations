import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "formations.cissesolutions.cloud" }],
        destination: "https://www.formations.cissesolutions.cloud/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      ...[
        "/admin/:path*",
        "/app/:path*",
        "/checkout",
        "/paiement/:path*",
        "/api/:path*",
      ].map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
