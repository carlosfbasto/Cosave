/** Íconos de trazo del perfil (barra lateral, métricas y estados vacíos); mismo estilo que los de la cabecera. */
const paths = {
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6",
  heart: "M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3 5 6.5 5c2 0 3.7 1.1 5.5 3 1.8-1.9 3.5-3 5.5-3C21 5 22.8 8.6 21.5 11.8 19.5 16.4 12 21 12 21z",
  chat: "M4 5h16v11H9l-5 4zM8 9.5h8M8 12.5h5",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4",
  home: "M4 11l8-7 8 7v9H4zM10 20v-6h4v6",
  pin: "M12 21s-6-5.6-6-11a6 6 0 0112 0c0 5.4-6 11-6 11zM12 12a2 2 0 100-4 2 2 0 000 4z",
  calendar: "M5 6h14v14H5zM5 10h14M9 4v4M15 4v4",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  phone: "M6.5 4h3l1.5 4-2 1.5a10 10 0 005.5 5.5l1.5-2 4 1.5v3a2 2 0 01-2 2A16 16 0 014.5 6a2 2 0 012-2z",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14M13 6l6 6-6 6",
  trash: "M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
} as const;

export type ProfileIconName = keyof typeof paths;

export function ProfileIcon({ name, className = "h-[18px] w-[18px]" }: { name: ProfileIconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}
