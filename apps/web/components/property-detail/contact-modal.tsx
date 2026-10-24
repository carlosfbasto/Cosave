"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  regions,
  validateContactEmail,
  validateContactName,
  validateContactPhone,
} from "./contact-utils";

const inputBase =
  "w-full rounded-lg border bg-white py-2 pl-3 pr-10 text-sm transition-colors placeholder:text-slate-400 focus:border-azure focus:outline-none focus:ring-2 focus:ring-azure/15";

/**
 * Campo con datos del perfil: gris mientras está guardado, negro mientras se edita.
 * Los cambios solo se aplican con la palomita verde (o Enter); el lápiz vuelve a abrir la edición.
 */
function ProfileField({
  id,
  label,
  value,
  region,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  sanitize = (v) => v,
  format = (v) => v,
  validate,
  onSave,
  onEditing,
}: {
  id: string;
  label: string;
  value: string;
  /** Solo teléfono: lada guardada; activa el selector. */
  region?: string;
  type?: string;
  placeholder: string;
  autoComplete: string;
  inputMode?: "numeric";
  sanitize?: (v: string) => string;
  format?: (v: string) => string;
  validate: (v: string) => string | null;
  onSave: (value: string, region: string) => void;
  onEditing: (id: string, editing: boolean) => void;
}) {
  const [editing, setEditing] = useState(!value); // sin dato en el perfil: nace editable
  const [draft, setDraft] = useState(value);
  const [draftRegion, setDraftRegion] = useState(region ?? "+52");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => onEditing(id, editing), [id, editing, onEditing]);

  function open() {
    setDraft(value);
    setDraftRegion(region ?? "+52");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function confirm() {
    const msg = validate(draft);
    setError(msg);
    if (msg) return;
    onSave(draft.trim(), draftRegion);
    setEditing(false);
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[0.9rem] font-medium text-ink">{label}</label>
      <div className="flex gap-2">
        {region !== undefined && (
          <select
            aria-label="Lada"
            value={editing ? draftRegion : region}
            disabled={!editing}
            onChange={(e) => setDraftRegion(e.target.value)}
            className={`w-[4.5rem] shrink-0 rounded-lg border border-slate-300 bg-white px-1.5 py-2 text-sm focus:border-azure focus:outline-none focus:ring-2 focus:ring-azure/15 disabled:appearance-none disabled:text-slate-500 ${editing ? "cursor-pointer text-slate-900" : "cursor-default"}`}
          >
            {regions.map((r) => (
              <option key={r.code} value={r.code}>{r.code}</option>
            ))}
          </select>
        )}
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            id={id}
            type={type}
            inputMode={inputMode}
            autoComplete={autoComplete}
            placeholder={placeholder}
            readOnly={!editing}
            value={editing ? format(draft) : format(value)}
            onChange={(e) => setDraft(sanitize(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (editing) confirm();
              }
            }}
            aria-invalid={!!error}
            aria-describedby={error ? `err-${id}` : undefined}
            className={`${inputBase} ${error ? "border-red-500" : "border-slate-300"} ${editing ? "text-slate-900" : "text-slate-500"}`}
          />
          {editing ? (
            <button
              type="button"
              onClick={confirm}
              aria-label={`Guardar ${label.toLowerCase()}`}
              title="Guardar cambios"
              className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-green-600 transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={open}
              aria-label={`Editar ${label.toLowerCase()}`}
              title={`Editar ${label.toLowerCase()}`}
              className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-slate-500 transition-colors hover:bg-azure hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4zM13.5 6.5l4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {error && <p id={`err-${id}`} role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

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
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contactar al anunciante</p>
      <h2 id="contact-modal-title" className="mt-1 text-lg font-bold leading-snug text-ink">{title}</h2>
      <p className="text-xs text-slate-500">Código {code}</p>
    </div>
  );

  if (unavailable || sent) {
    return (
      <div className="space-y-5 p-6">
        {header}
        <div role={unavailable ? "alert" : "status"} className="flex flex-col items-center gap-3 py-4 text-center">
          {!unavailable && <span className="grid h-14 w-14 place-items-center rounded-full bg-azure text-2xl font-bold text-white">✓</span>}
          <p className="font-bold text-ink">{unavailable ? "Esta publicación ya no está disponible" : "¡Consulta enviada!"}</p>
          <p className="text-sm text-slate-600">
            {unavailable
              ? `No es posible enviar nuevas consultas sobre “${title}”.`
              : "El anunciante podrá ver tu consulta. Aparecerá como pendiente hasta que responda."}
          </p>
        </div>
        <button type="button" onClick={onClose} className="w-full cursor-pointer rounded-lg bg-ink px-4 py-2.5 font-semibold text-white transition-colors hover:bg-ink-hover">
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
          <ProfileField
            id="cm-name" label="Nombre" value={name} placeholder="Tu nombre" autoComplete="name"
            sanitize={(v) => v.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, "")}
            validate={validateContactName}
            onSave={(v) => setSaved((s) => ({ ...s, name: v }))}
            onEditing={onEditing}
          />
          <ProfileField
            id="cm-email" label="Correo electrónico" type="email" value={email} placeholder="nombre@correo.com" autoComplete="email"
            validate={validateContactEmail}
            onSave={(v) => setSaved((s) => ({ ...s, email: v }))}
            onEditing={onEditing}
          />
          <ProfileField
            id="cm-phone" label="Teléfono" type="tel" inputMode="numeric" value={phone} region={region} placeholder="(999) 123-4567" autoComplete="tel-national"
            sanitize={(v) => v.replace(/\D/g, "").slice(0, 10)}
            format={formatPhone}
            validate={validateContactPhone}
            onSave={(v, r) => setSaved((s) => ({ ...s, phone: v, region: r }))}
            onEditing={onEditing}
          />
          <div>
            <label htmlFor="cm-msg" className="mb-1 block text-[0.9rem] font-medium text-ink">Mensaje</label>
            <textarea
              id="cm-msg"
              rows={4}
              maxLength={MAX_MSG}
              placeholder="Hola, me interesa esta propiedad…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-invalid={!!messageError}
              aria-describedby={messageError ? "err-cm-msg" : undefined}
              className={`w-full resize-none rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-azure focus:outline-none focus:ring-2 focus:ring-azure/15 ${messageError ? "border-red-500" : "border-slate-300"}`}
            />
            <div className="flex justify-between">
              <span>{messageError && <p id="err-cm-msg" role="alert" className="mt-1 text-xs text-red-600">{messageError}</p>}</span>
              <span className="mt-1 text-xs text-slate-500">{message.length}/{MAX_MSG}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">Solo compartimos con el anunciante de esta propiedad los datos que ves aquí, para responder tu consulta.</p>
          {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={sending}
              className="cursor-pointer rounded-lg bg-azure px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-azure-hover disabled:cursor-not-allowed disabled:opacity-60"
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
      className="m-auto max-h-[92vh] w-[min(94vw,28rem)] overflow-x-hidden rounded-xl p-0 shadow-veil backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      {open && <ModalBody code={code} title={title} onClose={onClose} />}
    </dialog>
  );
}
