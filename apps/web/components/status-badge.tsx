import { PROPERTY_STATUS_LABEL, type PropertyStatus } from "@cosave/shared";

export const STATUS_STYLE: Record<PropertyStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending: "bg-accent/30 text-navy",
  published: "bg-emerald-100 text-emerald-800",
  paused: "bg-sky-100 text-sky-800",
  sold: "bg-navy text-white",
  rented: "bg-navy text-white",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-slate-200 text-slate-600",
};

export function StatusBadge({ status }: { status: PropertyStatus }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>{PROPERTY_STATUS_LABEL[status]}</span>;
}
