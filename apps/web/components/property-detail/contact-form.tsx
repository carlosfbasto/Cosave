"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useCurrentUser } from "@/lib/current-user";
import { sendInquiry } from "@/lib/inquiries";

const regions = [
  { code: "+52", label: "México (+52)" },
  { code: "+1", label: "Estados Unidos (+1)" },
  { code: "+34", label: "España (+34)" },
  { code: "+57", label: "Colombia (+57)" },
  { code: "+54", label: "Argentina (+54)" },
];

const MAX_MSG = 100;
const NAME_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** (999) 123-4567 — solo dígitos, máx. 10. */
function formatPhone(digits: string) {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

type Errors = Partial<Record<"name" | "email" | "phone" | "message", string>>;

const field =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-800 transition-colors placeholder:text-slate-400 hover:border-navy-light focus:border-navy focus:outline-none";

/** Formulario "Me interesa": registra la consulta con la propiedad y el usuario (ver `lib/inquiries.ts`). */
export function ContactForm({
  propertyCode,
  propertyTitle,
  variant = "aside",
  onSent,
}: {
  propertyCode: string;
  propertyTitle: string;
  variant?: "aside" | "page";
  onSent?: () => void;
}) {
  const who = useCurrentUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("+52");
  const [phone, setPhone] = useState(""); // solo dígitos
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  function validate(): Errors {
    const e: Errors = {};
    if (!name.trim()) e.name = "Escribe tu nombre.";
    else if (!NAME_RE.test(name.trim())) e.name = "Solo letras, sin números ni símbolos.";
    if (!email.trim()) e.email = "Escribe tu correo.";
    else if (!EMAIL_RE.test(email.trim())) e.email = "Correo no válido (ej. nombre@correo.com).";
    if (!phone) e.phone = "Escribe tu teléfono.";
    else if (phone.length !== 10) e.phone = "El teléfono debe tener 10 dígitos.";
    if (!message.trim()) e.message = "Escribe un mensaje.";
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length > 0 || !who.id || sending) return;
    setSending(true);
    try {
      await sendInquiry({ id: who.id, remote: who.remote }, { code: propertyCode, title: propertyTitle }, {
        message: message.trim(),
        contactName: name.trim(),
        contactEmail: email.trim(),
        contactPhone: `${region} ${phone}`,
      });
      setSent(true);
      onSent?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setUnavailable(true);
      else setFormError("No pudimos registrar tu consulta. Inténtalo de nuevo en unos minutos.");
    } finally {
      setSending(false);
    }
  }

  const err = (k: keyof Errors) =>
    errors[k] ? (
      <p id={`err-${k}`} role="alert" className="mt-1 text-xs text-red-600">{errors[k]}</p>
    ) : null;
  const border = (k: keyof Errors) => (errors[k] ? "border-red-500" : "border-slate-300");

  return (
    <aside className={`flex w-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${variant === "aside" ? "min-h-[646px] lg:w-[370px]" : "min-h-[560px]"}`}>
      <div className="mb-5 border-b border-slate-100 pb-4 text-center">
        <p className="text-2xl font-bold text-navy">COSA<span className="text-accent">VE</span></p>
        <a href="tel:+529990000000" className="mt-1 inline-block text-sm font-semibold text-navy-light transition-colors hover:text-navy">
          Tel. +52 999 000 0000
        </a>
        <p className="mt-2 text-xs text-slate-500">Contacto por {propertyCode}</p>
      </div>

      {unavailable ? (
        <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="font-bold text-navy">Esta publicación ya no está disponible</p>
          <p className="text-sm text-slate-600">No es posible enviar nuevas consultas sobre “{propertyTitle}”.</p>
          <Link href="/properties" className="text-sm font-semibold text-navy underline">Explorar propiedades</Link>
        </div>
      ) : sent ? (
        <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-accent text-2xl font-bold text-navy">✓</span>
          <p className="font-bold text-navy">¡Consulta enviada!</p>
          <p className="text-sm text-slate-600">
            Quedó registrada sobre “{propertyTitle}” y el anunciante podrá verla. Aún no ha respondido: tu consulta aparece como pendiente.
          </p>
          <button
            type="button"
            onClick={() => { setSent(false); setName(""); setEmail(""); setPhone(""); setMessage(""); }}
            className="text-sm font-semibold text-navy underline"
          >
            Enviar otra consulta
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col gap-4">
          <div>
            <label htmlFor="cf-name" className="mb-1 block text-[0.9rem] font-medium text-navy">Nombre</label>
            <input
              id="cf-name"
              autoComplete="name"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, ""))}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "err-name" : undefined}
              className={`${field} ${border("name")}`}
            />
            {err("name")}
          </div>
          <div>
            <label htmlFor="cf-email" className="mb-1 block text-[0.9rem] font-medium text-navy">Correo electrónico</label>
            <input
              id="cf-email"
              type="email"
              autoComplete="email"
              placeholder="nombre@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "err-email" : undefined}
              className={`${field} ${border("email")}`}
            />
            {err("email")}
          </div>
          <div>
            <label htmlFor="cf-region" className="mb-1 block text-[0.9rem] font-medium text-navy">Teléfono</label>
            <select id="cf-region" value={region} onChange={(e) => setRegion(e.target.value)} className={`${field} mb-2 cursor-pointer border-slate-300`}>
              {regions.map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
            <input
              id="cf-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              aria-label="Número de teléfono"
              placeholder="(999) 123-4567"
              value={formatPhone(phone)}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "err-phone" : undefined}
              className={`${field} ${border("phone")}`}
            />
            {err("phone")}
          </div>
          <div>
            <label htmlFor="cf-msg" className="mb-1 block text-[0.9rem] font-medium text-navy">Mensaje</label>
            <textarea
              id="cf-msg"
              rows={4}
              maxLength={MAX_MSG}
              placeholder="Hola, me interesa esta propiedad…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? "err-message" : undefined}
              className={`${field} resize-none ${border("message")}`}
            />
            <div className="flex justify-between">
              <span>{err("message")}</span>
              <span className="mt-1 text-xs text-slate-500">{message.length}/{MAX_MSG}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Solo compartimos con el anunciante de esta propiedad los datos que escribes aquí, para responder tu consulta.
          </p>
          {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={sending}
            className="mt-auto cursor-pointer rounded-md bg-accent px-4 py-3 font-semibold text-navy transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Enviando…" : "Enviar consulta"}
          </button>
        </form>
      )}
    </aside>
  );
}
