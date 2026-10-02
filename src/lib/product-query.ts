import type { ProductQuery } from "@/lib/store";

export function toQuery(params: Record<string, string | string[] | undefined>): ProductQuery {
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  return {
    q: one("q"),
    category: one("category"),
    min: one("min"),
    max: one("max"),
    available: one("available"),
    weight: one("weight"),
    sort: one("sort"),
    page: one("page"),
  };
}
