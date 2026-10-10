export const dynamic = "force-dynamic";
import { privateMetadata } from "@/lib/seo";
export const metadata = { ...privateMetadata, title: "Administration" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
