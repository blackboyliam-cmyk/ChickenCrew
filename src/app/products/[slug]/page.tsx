import { redirect } from "next/navigation";

export default async function LegacyProductPath({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/product/${slug}`);
}
