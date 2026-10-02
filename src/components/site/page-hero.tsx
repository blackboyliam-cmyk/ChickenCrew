import Image from "next/image";

export function PageHero({ eyebrow, title, body, image = "/media/hero.jpg" }: { eyebrow: string; title: string; body?: string; image?: string }) {
  return (
    <section className="relative mt-5 overflow-hidden rounded-3xl bg-charcoal text-white md:mt-8">
      <Image src={image} alt="" fill sizes="(min-width: 1024px) 1100px, 100vw" className="object-cover opacity-30" priority />
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/85 to-charcoal/30" />
      <div className="relative max-w-2xl px-6 py-10 md:px-10 md:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-[40px] md:leading-tight">{title}</h1>
        {body && <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">{body}</p>}
      </div>
    </section>
  );
}
