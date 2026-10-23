import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { statusNames } from "@/lib/format";

export function DataTable({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <div className="table-wrap data-table-wrap">
      <table className="data-table" role="table">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function DataCell({
  label,
  primary = false,
  children,
  className = "",
}: {
  label: string;
  primary?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      role="cell"
      data-label={label}
      className={`${primary ? "data-primary" : ""} ${className}`}
    >
      <div className="data-cell-content">{children}</div>
    </td>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge status-${status}`}>
      {statusNames[status] || status}
    </span>
  );
}

export function EmptyState({ title }: { title: string }) {
  return (
    <div className="list-empty" role="status">
      <Inbox size={28} strokeWidth={1.5} aria-hidden="true" />
      <p>{title}</p>
    </div>
  );
}
