import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://karthikachickencentre.shop";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/account", "/checkout", "/cart"],
    },
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
