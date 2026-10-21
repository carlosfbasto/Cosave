"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditableField } from "@/components/editable-field";
import { ApiError } from "@/lib/api";
import { useCurrentUser } from "@/lib/current-user";
import { useDemoUser } from "@/lib/demo-session";
import { sendInquiry } from "@/lib/inquiries";
import { useProfile } from "@/lib/use-profile";
import {
  MAX_MSG,
  formatPhone,
  nationalDigits,
  regionOf,
  validateContactEmail,
  validateContactName,
  validateContactPhone,
} from "./contact-utils";

type Saved = { name?: string; email?: string; phone?: string; region?: string };

function ModalBody({ code, title, onClose }: { code: string; title: string; onClose: () => void }) {
  const who = useCurrentUser();
  const { user: demo } = useDemoUser();
  const { profile, loading } = useProfile();
  const base = who.remote ? profile : demo ? { fullName: demo.fullName, email: demo.email, phone: demo.phone } : null;
  const ready = !who.remote || !loading;

  // Valores guardados con la palomita; mientras no se toquen siguen al perfil.
  const [saved, setSaved] = useState<Saved>({});
  const [editingKeys, setEditingKeys] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const name = saved.name ?? base?.fullName ?? "";
  const email = saved.email ?? base?.email ?? "";
  const phone = saved.phone ?? nationalDigits(base?.phone);
  const region = saved.region ?? regionOf(base?.phone);

  const onEditing = useCallback((k: string, v: boolean) => setEditingKeys((s) => (s[k] === v ? s : { ...s, [k]: v })), []);

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError(null);
    const msgErr = message.trim() ? null : "Escribe un mensaje.";
    setMessageError(msgErr);
    if (Object.values(editingKeys).some(Boolean)) {
      setFormError("Confirma con la palomita verde los datos que estás editando antes de enviar.");
      return;
    }
    if (msgErr || validateContactName(name) || validateContactEmail(email) || validateContactPhone(phone) || !who.id || sending) return;
    setSending(true);
    try {
      await sendInquiry({ id: who.id, remote: who.remote }, { code, title }, {
        message: message.trim(),
        contactName: name.trim(),
        contactEmail: email.trim(),
        contactPhone: `${region} ${phone}`,
      });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setUnavailable(true);
      else setFormError("No pudimos registrar tu consulta. Inténtalo de nuevo en unos minutos.");
    } finally {
      setSending(false);
    }
  }

  const header = (
    <div className="border-b border-slate-100 pb-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-light">Contactar al anunciante</p>
      <h2 id="contact-modal-title" className="mt-1 text-lg font-bold leading-snug text-navy">{title}</h2>
      <p className="text-xs text-slate-500">Código {code}</p>
    </div>
  );

  if (unavailable || sent) {
    return (
      <div className="space-y-5 p-6">
        {header}
        <div role={unavailable ? "alert" : "status"} className="flex flex-col items-center gap-3 py-4 text-center">
          {!unavailable && <span className="grid h-14 w-14 place-items-center rounded-full bg-accent text-2xl font-bold text-navy">✓</span>}
          <p className="font-bold text-navy">{unavailable ? "Esta publicación ya no está disponible" : "¡Consulta enviada!"}</p>
          <p className="text-sm text-slate-600">
            {unavailable
              ? `No es posible enviar nuevas consultas sobre “${title}”.`
              : "El anunciante podrá ver tu consulta. Aparecerá como pendiente hasta que responda."}
          </p>
        </div>
        <button type="button" onClick={onClose} className="w-full cursor-pointer rounded-md bg-accent px-4 py-2.5 font-semibold text-navy transition-colors hover:bg-accent-hover">
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 p-6">
      {header}
      {!ready ? (
        <p className="py-8 text-center text-sm text-slate-600">Cargando tus datos…</p>
      ) : (
        <>
          <EditableField
            id="cm-name" label="Nombre" value={name} placeholder="Tu nombre" autoComplete="name"
            sanitize={(v) => v.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, "")}
            validate={validateContactName}
            onSave={(v) => setSaved((s) => ({ ...s, name: v }))}
            onEditing={onEditing}
          />
          <EditableField
            id="cm-email" label="Correo electrónico" type="email" value={email} placeholder="nombre@correo.com" autoComplete="email"
            validate={validateContactEmail}
            onSave={(v) => setSaved((s) => ({ ...s, email: v }))}
            onEditing={onEditing}
          />
          <EditableField
            id="cm-phone" label="Teléfono" type="tel" inputMode="numeric" value={phone} region={region} placeholder="(999) 123-4567" autoComplete="tel-national"
            sanitize={(v) => v.replace(/\D/g, "").slice(0, 10)}
            format={formatPhone}
            validate={validateContactPhone}
            onSave={(v, r) => setSaved((s) => ({ ...s, phone: v, region: r }))}
            onEditing={onEditing}
          />
          <div>
            <label htmlFor="cm-msg" className="mb-1 block text-[0.9rem] font-medium text-navy">Mensaje</label>
            <textarea
              id="cm-msg"
              rows={4}
              maxLength={MAX_MSG}
              placeholder="Hola, me interesa esta propiedad…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-invalid={!!messageError}
              aria-describedby={messageError ? "err-cm-msg" : undefined}
              className={`w-full resize-none rounded-md border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy focus:outline-none ${messageError ? "border-red-500" : "border-slate-300"}`}
            />
            <div className="flex justify-between">
              <span>{messageError && <p id="err-cm-msg" role="alert" className="mt-1 text-xs text-red-600">{messageError}</p>}</span>
              <span className="mt-1 text-xs text-slate-500">{message.length}/{MAX_MSG}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">Solo compartimos con el anunciante de esta propiedad los datos que ves aquí, para responder tu consulta.</p>
          {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sending}
              className="cursor-pointer rounded-md bg-accent px-5 py-2 text-sm font-semibold text-navy transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Enviando…" : "Enviar consulta"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

/** Modal "Me interesa": contacto con el anunciante con los datos del perfil precargados y editables. */
export function ContactModal({ open, code, title, onClose }: { open: boolean; code: string; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby="contact-modal-title"
      className="m-auto max-h-[92vh] w-[min(94vw,28rem)] overflow-x-hidden rounded-xl p-0 shadow-2xl backdrop:bg-navy/50"
    >
      {open && <ModalBody code={code} title={title} onClose={onClose} />}
    </dialog>
  );
}
