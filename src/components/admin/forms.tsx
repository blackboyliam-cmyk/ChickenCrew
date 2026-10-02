"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiClientError } from "@/lib/api-client";

export function useAdmin<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  async function load() {
    try {
      setData(await api<T>(path));
      setError("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  return { data, error, reload: load, setError };
}

export function Field({ label, value, onChange, area = false }: { label: string; value: string; onChange: (value: string) => void; area?: boolean }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <label className="block text-sm" htmlFor={id}>
      {label}
      {area ? (
        <Textarea id={id} className="mt-1" value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <Input id={id} className="mt-1" value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

export function SaveButton({ onClick }: { onClick: () => Promise<void> }) {
  const [error, setError] = useState("");
  return (
    <div>
      <Button
        type="button"
        onClick={() =>
          onClick().catch((err) => setError(err instanceof ApiClientError ? err.message : "Something went wrong."))
        }
      >
        Save
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

export async function saveAdmin(path: string, body: unknown, method = "POST") {
  return api(path, { method, body });
}
