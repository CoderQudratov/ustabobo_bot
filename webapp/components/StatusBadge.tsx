"use client";

/** Semantic badge classes — dark/light mavzuda ham o‘qilishi yaxshi */
const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  draft: { label: "Qoralama", className: "badge-neutral" },
  waiting_confirmation: { label: "Tasdiqlash kutilmoqda", className: "badge-warning" },
  broadcasted: { label: "E'lon qilindi", className: "badge-warning" },
  accepted: { label: "Qabul qilindi", className: "badge-primary" },
  received_by_driver: { label: "Qabul qilindi (kuryer)", className: "badge-primary" },
  waiting_master_delivery_confirmation: { label: "Usta tasdiqlashi kutilmoqda", className: "badge-warning" },
  waiting_master_work_start: { label: "Ishni boshlash kutilmoqda", className: "badge-warning" },
  delivered_by_driver: { label: "Yetkazildi", className: "badge-success" },
  received_by_master: { label: "Qabul qilindi (usta)", className: "badge-primary" },
  working: { label: "Ish jarayonida", className: "badge-primary" },
  waiting_customer_confirmation: { label: "Mijoz tasdiqlashi", className: "badge-warning" },
  completed: { label: "Yakunlangan", className: "badge-success" },
  cancelled: { label: "Bekor qilindi", className: "badge-danger" },
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
      className: "badge-neutral",
    };
  const isActive = ACTIVE_STATUSES.has(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-solid px-2.5 py-0.5 text-[11.5px] font-medium ${config.className} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? "animate-pulse" : ""}`}
        style={{ backgroundColor: "currentColor" }}
      />
      {config.label}
    </span>
  );
}
