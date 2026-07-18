"use client";

import { useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";
import { EmptyState } from "./empty-state";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Show the global search box. */
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Extra toolbar content (filters) rendered next to the search box. */
  toolbar?: React.ReactNode;
  /** Make rows clickable (navigation). Adds pointer + keyboard activation. */
  onRowClick?: (row: TData) => void;
  /** Below md, render stacked label/value cards instead of the table (default true). */
  mobileCards?: boolean;
}

/** Themed, accessible table with sorting, filtering and pagination. */
export function DataTable<TData, TValue>({
  columns,
  data,
  searchable = false,
  searchPlaceholder = "Rechercher…",
  pageSize = 8,
  isLoading = false,
  emptyTitle = "Aucun résultat",
  emptyDescription = "Aucune donnée à afficher pour le moment.",
  toolbar,
  onRowClick,
  mobileCards = true,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="flex flex-col gap-3">
      {(searchable || toolbar) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <div className="border-border bg-surface2 flex min-w-[220px] flex-1 items-center gap-2.5 rounded-[10px] border px-3 py-2">
              <Search className="text-muted size-4" strokeWidth={1.8} />
              <input
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="text-foreground w-full border-0 bg-transparent text-[12.5px] font-semibold outline-none"
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      {/* Cartes empilées sur mobile (une carte par ligne) */}
      {mobileCards && (
        <div className="flex flex-col gap-2.5 md:hidden">
          {isLoading ? (
            <div className="text-muted border-border bg-surface flex items-center justify-center gap-2 rounded-lg border py-10 text-sm font-semibold">
              <Loader2 className="size-4 animate-spin" /> Chargement…
            </div>
          ) : rows.length === 0 ? (
            <div className="border-border bg-surface rounded-lg border">
              <EmptyState title={emptyTitle} description={emptyDescription} />
            </div>
          ) : (
            rows.map((row) => {
              const cells = row.getVisibleCells();
              return (
                <div
                  key={row.id}
                  className={cn(
                    "border-border bg-surface rounded-xl border p-4",
                    onRowClick &&
                      "focus-visible:border-accent/50 cursor-pointer outline-none",
                  )}
                  {...(onRowClick && {
                    role: "button",
                    tabIndex: 0,
                    onClick: () => onRowClick(row.original),
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row.original);
                      }
                    },
                  })}
                >
                  {cells.map((cell, i) => {
                    const header = cell.column.columnDef.header;
                    const label = typeof header === "string" ? header : "";
                    const content = flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    );
                    if (i === 0) {
                      return (
                        <div
                          key={cell.id}
                          className="border-border mb-2.5 border-b pb-2.5 text-[14px] font-bold"
                        >
                          {content}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={cell.id}
                        className="flex items-center justify-between gap-3 py-1 text-[12.5px]"
                      >
                        <span className="text-muted flex-none font-semibold">
                          {label}
                        </span>
                        <span className="text-foreground min-w-0 text-right">
                          {content}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}

      <div
        className={cn(
          "border-border bg-surface overflow-x-auto rounded-lg border",
          mobileCards && "hidden md:block",
        )}
      >
        <table className="w-full border-collapse text-left">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-border border-b">
                {hg.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      className="text-muted px-4 py-3 text-[11px] font-bold tracking-[0.4px] whitespace-nowrap uppercase"
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="hover:text-foreground inline-flex items-center gap-1.5"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <ArrowUpDown className="size-3 opacity-60" />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-14">
                  <div className="text-muted flex items-center justify-center gap-2 text-sm font-semibold">
                    <Loader2 className="size-4 animate-spin" />
                    Chargement…
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-border hover:bg-hover border-b transition-colors last:border-0",
                    onRowClick &&
                      "focus-visible:bg-hover cursor-pointer outline-none",
                  )}
                  {...(onRowClick && {
                    role: "button",
                    tabIndex: 0,
                    onClick: () => onRowClick(row.original),
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row.original);
                      }
                    },
                  })}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="text-foreground px-4 py-3 text-[13px] font-semibold"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && rows.length > 0 && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-muted text-[12px] font-semibold">
            {table.getFilteredRowModel().rows.length} élément(s) · page{" "}
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </div>
          <div className="flex gap-1.5">
            <PagerButton
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              label="Page précédente"
            >
              <ChevronLeft className="size-4" />
            </PagerButton>
            <PagerButton
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              label="Page suivante"
            >
              <ChevronRight className="size-4" />
            </PagerButton>
          </div>
        </div>
      )}
    </div>
  );
}

function PagerButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "border-border bg-surface text-foreground hover:bg-hover flex size-8 items-center justify-center rounded-[9px] border transition-colors",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {children}
    </button>
  );
}
