"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ESTIMATE_STATUSES, labelOf } from "@/lib/constants";
import { estimateMailMessage, estimateMailSubject, type VehicleMailInfo } from "@/lib/estimateMail";

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
  title = "Confirmer la suppression",
  message = "Cette action est définitive.",
}: {
  url: string;
  redirectTo: string;
  label?: string;
  title?: string;
  message?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    const res = await fetch(url, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Suppression impossible");
      return;
    }
    setOpen(false);
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="danger" disabled={busy} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        title={title}
        message={error ?? message}
        busy={busy}
        onCancel={() => {
          if (busy) return;
          setOpen(false);
          setError(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </>
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

export function EmailEstimate({
  id,
  defaultTo,
  defaultCc,
  estimateNumber,
  companyName = "DMK Services",
  vehicle,
}: {
  id: string;
  defaultTo?: string | null;
  defaultCc?: string | null;
  estimateNumber: string;
  companyName?: string;
  vehicle: VehicleMailInfo;
}) {
  const defaultSubject = estimateMailSubject(vehicle);
  const defaultMessage = estimateMailMessage(estimateNumber, vehicle, companyName, defaultCc);
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultTo ?? "");
  const [cc, setCc] = useState(defaultCc ?? "");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [msg, setMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  function openModal() {
    setTo(defaultTo ?? "");
    setCc(defaultCc ?? "");
    setSubject(defaultSubject);
    setMessage(defaultMessage);
    setMsg(null);
    setOpen(true);
  }

  async function send() {
    setSending(true);
    setMsg(null);
    const res = await fetch(`/api/estimates/${id}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, cc, subject, message }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) setMsg(data.error);
    else {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button type="button" variant="ghost" onClick={openModal}>
        Envoyer par email
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-lg space-y-3 p-5">
            <h3 className="font-semibold text-navy">Envoyer le devis</h3>
            <Field label="A">
              <Input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="destinataire@email.fr"
                required
              />
            </Field>
            <Field label="CC" hint="Optionnel, plusieurs adresses séparées par une virgule">
              <Input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="copie@email.fr"
              />
            </Field>
            <Field label="Objet">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field label="Message">
              <Textarea rows={12} value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
            <a
              href={`/api/estimates/${id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm font-medium text-amber-600 hover:underline"
            >
              Aperçu du devis à envoyer (PDF)
            </a>
            {msg ? <p className="text-sm text-red-600">{msg}</p> : null}
            <div className="flex gap-2">
              <Button type="button" onClick={send} disabled={sending || !to.trim()}>
                {sending ? "Envoi…" : "Envoyer"}
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
