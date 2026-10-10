export const dynamic = "force-dynamic";
import { privateMetadata } from "@/lib/seo";
export const metadata = {
  ...privateMetadata,
  title: "Mon business",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mon business",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
