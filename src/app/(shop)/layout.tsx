import { SiteShell } from "@/components/site/site-shell";
import { getPublicSettings, withDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const settings = await withDb(getPublicSettings);
  return <SiteShell settings={settings}>{children}</SiteShell>;
}
