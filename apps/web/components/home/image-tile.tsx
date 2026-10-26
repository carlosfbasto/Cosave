import Image from "next/image";
import Link from "next/link";

export function ImageTile({ href, image, label, count }: { href: string; image: string; label: string; count: number }) {
  return (
    <Link
      href={href}
      className="group relative block aspect-[4/5] overflow-hidden rounded-3xl transition-shadow duration-300 hover:shadow-glow"
    >
      <Image
        src={image}
        alt={label}
        fill
        sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 100vw"
        className="object-cover transition-transform duration-[350ms] group-hover:scale-[1.02]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent transition-colors group-hover:from-ink" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <h3 className="text-xl font-bold">{label}</h3>
        <p className="text-sm text-slate-200">{count.toLocaleString("es-MX")} propiedades</p>
      </div>
    </Link>
  );
}
