"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ESTIMATE_STATUSES, labelOf } from "@/lib/constants";

export function WriteOnly({
  canWrite,
  children,
}: {
  canWrite: boolean;
  children: React.ReactNode;
}) {
  if (!canWrite) return null;
  return <>{children}</>;
}

export function CsvImport() {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onChange() {
    const file = ref.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/clients/import", { method: "POST", body: fd });
    const data = await res.json();
    setMsg(res.ok ? `${data.created} importé(s), ${data.skipped} ignoré(s)` : data.error);
    router.refresh();
  }

  return (
    <>
      <input ref={ref} type="file" accept=".csv" className="hidden" onChange={onChange} />
      <Button type="button" variant="ghost" onClick={() => ref.current?.click()}>
        Importer CSV
      </Button>
      {msg ? <span className="text-sm text-slate-500">{msg}</span> : null}
    </>
  );
}

export function DeleteButton({
  url,
  redirectTo,
  label = "Supprimer",
}: {
  url: string;
  redirectTo: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="danger"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Confirmer la suppression ?")) return;
        setBusy(true);
        const res = await fetch(url, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) {
          alert(data.error || "Suppression impossible");
          return;
        }
        router.push(redirectTo);
        router.refresh();
      }}
    >
      {label}
    </Button>
  );
}

export function DuplicateEstimateButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={async () => {
        const res = await fetch(`/api/estimates/${id}/duplicate`, { method: "POST" });
        const data = await res.json();
        if (res.ok) router.push(`/estimates/${data.id}`);
        else alert(data.error);
      }}
    >
      Dupliquer
    </Button>
  );
}

const STATUS_FLOW: Record<string, string[]> = {
  DRAFT: ["SENT", "REJECTED"],
  SENT: ["APPROVED", "REJECTED", "DRAFT"],
  APPROVED: ["INVOICED", "REJECTED"],
  REJECTED: ["DRAFT"],
  INVOICED: [],
};

export function StatusActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = STATUS_FLOW[status] ?? [];
  if (!next.length) return null;

  async function change(to: string) {
    setBusy(true);
    const res = await fetch(`/api/estimates/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: to,
        note: to === "INVOICED" ? "Conversion en facture" : `Statut : ${labelOf(ESTIMATE_STATUSES, to)}`,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Changement de statut impossible");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {next.map((to) => (
        <Button
          key={to}
          type="button"
          variant={to === "INVOICED" || to === "APPROVED" ? "navy" : to === "REJECTED" ? "danger" : "ghost"}
          disabled={busy}
          onClick={() => change(to)}
        >
          {to === "INVOICED" ? "Convertir en facture" : labelOf(ESTIMATE_STATUSES, to)}
        </Button>
      ))}
    </div>
  );
}

export function InvoiceButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="navy"
      onClick={async () => {
        const res = await fetch(`/api/estimates/${id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "INVOICED", note: "Conversion en facture" }),
        });
        if (res.ok) router.refresh();
      }}
    >
      Convertir en facture
    </Button>
  );
}

export function EmailEstimate({ id, defaultTo }: { id: string; defaultTo?: string | null }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultTo ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function send() {
    const res = await fetch(`/api/estimates/${id}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to }),
    });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        Envoyer par email
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md space-y-3 p-5">
            <h3 className="font-semibold text-navy">Envoyer le devis</h3>
            <input className="input" value={to} onChange={(e) => setTo(e.target.value)} placeholder="destinataire@email.fr" />
            {msg ? <p className="text-sm text-red-600">{msg}</p> : null}
            <div className="flex gap-2">
              <Button type="button" onClick={send}>
                Envoyer
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
