"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, ApiClientError } from "@/lib/api-client";

export function errorText(err: unknown) {
  return err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.";
}

export function useAdmin<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setData(await api<T>(path));
      setError("");
    } catch (err) {
      setError(errorText(err));
    }
  }, [path]);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, error, reload: load, setError };
}

export async function saveAdmin(path: string, body: unknown, method = "POST") {
  return api(path, { method, body });
}

/** Runs an admin write, shows a toast either way, and resolves to whether it worked. */
export async function attempt(work: () => Promise<unknown>, success: string) {
  try {
    await work();
    toast.success(success);
    return true;
  } catch (err) {
    toast.error(errorText(err));
    return false;
  }
}

export const toRupees = (paise: number | null | undefined) => (paise == null ? "" : String(paise / 100));

/* ------------------------------------------------------------------ Layout */

export function AdminHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-[28px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-20 rounded-2xl border bg-white shadow-card", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            {title && <h2 className="text-[15px] font-bold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ Inputs */

const inputClass =
  "h-11 w-full rounded-xl border bg-white px-3.5 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-3 focus:ring-primary/15 disabled:bg-muted";

export function Field({
  label,
  value,
  onChange,
  area = false,
  type = "text",
  hint,
  prefix,
  placeholder,
  className,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
  type?: string;
  hint?: string;
  prefix?: string;
  placeholder?: string;
  className?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      {area ? (
        <textarea
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className={cn(inputClass, "mt-1.5 h-auto min-h-24 py-2.5 leading-6")}
        />
      ) : prefix ? (
        <div className="mt-1.5 flex h-11 items-center overflow-hidden rounded-xl border bg-white focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15">
          <span className="grid h-full place-items-center border-r bg-muted/60 px-3 text-sm font-semibold text-muted-foreground">
            {prefix}
          </span>
          <input
            id={id}
            type={type}
            inputMode={inputMode}
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none placeholder:text-muted-foreground/60"
          />
        </div>
      ) : (
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={cn(inputClass, "mt-1.5")}
        />
      )}
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={cn(inputClass, "mt-1.5 pr-8")}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted-foreground/30",
      )}
    >
      <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5.5" : "translate-x-0.5")} />
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border bg-white px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

/* ------------------------------------------------------------------ Display */

const TONES = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/25",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/20",
  gray: "bg-muted text-muted-foreground ring-border",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone = "gray", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyRow({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y" aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-5 py-4">
          <div className="size-10 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/5 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
      {message}
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold underline-offset-2 hover:underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function SubmitButton({ busy, children, className }: { busy: boolean; children: React.ReactNode; className?: string }) {
  return (
    <Button type="submit" disabled={busy} className={cn("h-11 rounded-xl px-5 font-bold", className)}>
      {busy && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}

export function EditorDialog({
  open,
  onClose,
  title,
  description,
  onSubmit,
  busy,
  submitLabel,
  children,
  footerStart,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  onSubmit: () => void;
  busy: boolean;
  submitLabel: string;
  children: React.ReactNode;
  footerStart?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <DialogHeader className="border-b px-6 py-5 text-left">
            <DialogTitle className="text-lg font-extrabold">{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">{children}</div>
          <div className="flex items-center justify-between gap-2 border-t px-6 py-4">
            {footerStart ?? <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onClose}>
                Cancel
              </Button>
              <SubmitButton busy={busy}>{submitLabel}</SubmitButton>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={cn(inputClass, "h-10 max-w-xs text-sm")}
    />
  );
}
