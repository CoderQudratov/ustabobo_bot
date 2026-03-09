"use client";

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  draft: {
    label: "Qoralama",
    className: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  },
  waiting_confirmation: {
    label: "Tasdiqlash kutilmoqda",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  broadcasted: {
    label: "E'lon qilindi",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  accepted: {
    label: "Qabul qilindi",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
  received_by_driver: {
    label: "Qabul qilindi (kuryer)",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
  waiting_master_delivery_confirmation: {
    label: "Usta tasdiqlashi kutilmoqda",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  waiting_master_work_start: {
    label: "Ishni boshlash kutilmoqda",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  delivered_by_driver: {
    label: "Yetkazildi",
    className: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
  },
  received_by_master: {
    label: "Qabul qilindi (usta)",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
  working: {
    label: "Ish jarayonida",
    className: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  },
  waiting_customer_confirmation: {
    label: "Mijoz tasdiqlashi",
    className: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  },
  completed: {
    label: "Yakunlangan",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  },
  cancelled: {
    label: "Bekor qilindi",
    className: "bg-red-500/10 text-red-600 border-red-500/30",
  },
};

const ACTIVE_STATUSES = new Set([
  "working", "accepted", "received_by_master", "broadcasted",
  "waiting_confirmation", "waiting_customer_confirmation",
  "waiting_master_delivery_confirmation", "waiting_master_work_start",
  "received_by_driver", "delivered_by_driver",
]);

export function StatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const config =
    STATUS_CONFIG[status] ?? {
      label: status,
      className: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    };
  const isActive = ACTIVE_STATUSES.has(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium ${config.className} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? "animate-pulse" : ""}`}
        style={{ backgroundColor: "currentColor" }}
      />
      {config.label}
    </span>
  );
}
