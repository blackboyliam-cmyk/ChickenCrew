import Image from "next/image";

export function PageHero({ eyebrow, title, body, image = "/media/hero.jpg" }: { eyebrow: string; title: string; body?: string; image?: string }) {
  return (
    <section className="relative mt-4 overflow-hidden rounded-2xl bg-charcoal text-white md:mt-8 md:rounded-3xl">
      <Image src={image} alt="" fill sizes="(min-width: 1024px) 1100px, 100vw" className="object-cover opacity-30" priority />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/85 to-charcoal/40 md:bg-gradient-to-r md:via-charcoal/85 md:to-charcoal/30" />
      <div className="relative max-w-2xl px-5 py-8 sm:px-6 md:px-10 md:py-14">
        <p className="text-[11px] font-bold tracking-[0.16em] text-amber-300 uppercase md:text-xs md:tracking-[0.18em]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-[28px] leading-[1.12] font-extrabold tracking-tight md:text-[40px] md:leading-tight">
          {title}
        </h1>
        {body && <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-white/75 md:mt-3 md:text-base">{body}</p>}
      </div>
    </section>
  );
}
