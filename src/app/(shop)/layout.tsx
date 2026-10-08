import { SiteShell } from "@/components/site/site-shell";
import { isAdmin } from "@/lib/auth";
import { getPublicSettings, withDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [settings, admin] = await Promise.all([withDb(getPublicSettings), isAdmin()]);
  return (
    <SiteShell settings={settings} admin={admin}>
      {children}
    </SiteShell>
  );
}
