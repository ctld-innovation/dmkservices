"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, ErrorText } from "@/components/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Snapshot = { filename: string; size: number; savedAt: string };

type Pending =
  | { type: "restore-file"; file: File }
  | { type: "restore-server"; filename: string }
  | { type: "delete"; filename: string };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} Ko`;
  return `${Math.round(bytes / 1024 / 102.4) / 10} Mo`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR");
}

export function BackupSettings({ isAdmin }: { isAdmin: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const loadSnapshots = useCallback(async () => {
    const res = await fetch("/api/backup/snapshots");
    const data = await res.json().catch(() => []);
    if (!res.ok) throw new Error(data.error || "Impossible de lister les sauvegardes");
    setSnapshots(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    void loadSnapshots()
      .catch((err) => setError(err instanceof Error ? err.message : "Chargement impossible"))
      .finally(() => setLoading(false));
  }, [isAdmin, loadSnapshots]);

  async function saveOnServer() {
    setSaving(true);
    setError(null);
    setOk(null);
    const res = await fetch("/api/backup", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Sauvegarde serveur impossible");
      return;
    }
    setOk(`Sauvegarde enregistrée sur le serveur : ${data.filename}`);
    await loadSnapshots().catch(() => undefined);
  }

  async function confirmPending() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      if (pending.type === "delete") {
        const res = await fetch(`/api/backup/snapshots/${encodeURIComponent(pending.filename)}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Suppression impossible");
        setOk("Sauvegarde serveur supprimée");
        await loadSnapshots();
        return;
      }
      const res =
        pending.type === "restore-file"
          ? await fetch("/api/backup/restore", {
              method: "POST",
              body: (() => {
                const form = new FormData();
                form.append("file", pending.file);
                return form;
              })(),
            })
          : await fetch("/api/backup/restore", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filename: pending.filename }),
            });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Restauration impossible");
      window.location.href = "/settings?tab=backup";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setBusy(false);
      setPending(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const confirmTitle =
    pending?.type === "delete"
      ? "Supprimer cette sauvegarde ?"
      : "Remplacer toutes les données ?";
  const confirmMessage =
    pending?.type === "delete"
      ? `Le fichier « ${pending.filename} » sera supprimé du serveur.`
      : pending?.type === "restore-file"
        ? `Les données actuelles seront remplacées par le fichier « ${pending.file.name} ». Une copie de sécurité sera d'abord enregistrée sur le serveur.`
        : pending
          ? `Les données actuelles seront remplacées par « ${pending.filename} ». Une copie de sécurité sera d'abord enregistrée sur le serveur.`
          : "";

  if (!isAdmin) {
    return (
      <div className="card space-y-3 p-6">
        <p className="text-sm">Réservé à l&apos;administrateur.</p>
      </div>
    );
  }

  return (
    <div className="card space-y-6 p-6">
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Téléchargez un fichier JSON, enregistrez une copie sur le serveur, ou restaurez une
          sauvegarde. Une restauration remplace clients, véhicules, devis, listes et paramètres. Les
          photos ne sont pas dans le JSON (seuls les chemins sont conservés). Une copie de sécurité
          est créée automatiquement avant chaque restauration.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="/api/backup" className="btn btn-primary inline-flex">
            Télécharger le fichier JSON
          </a>
          <Button type="button" variant="navy" onClick={() => void saveOnServer()} disabled={saving}>
            {saving ? "Enregistrement…" : "Sauvegarder sur le serveur"}
          </Button>
        </div>
      </div>

      <div className="space-y-3 border-t border-line pt-5">
        <h3 className="font-semibold text-navy">Restaurer depuis un fichier</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="input max-w-md"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPending({ type: "restore-file", file });
            }}
          />
        </div>
      </div>

      <div className="space-y-3 border-t border-line pt-5">
        <h3 className="font-semibold text-navy">Sauvegardes sur le serveur</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : snapshots.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune sauvegarde enregistrée sur le serveur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Fichier</th>
                  <th>Date</th>
                  <th>Taille</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((item) => (
                  <tr key={item.filename}>
                    <td className="font-mono text-xs">{item.filename}</td>
                    <td>{formatDate(item.savedAt)}</td>
                    <td>{formatSize(item.size)}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-2">
                        <a
                          href={`/api/backup/snapshots/${encodeURIComponent(item.filename)}`}
                          className="text-xs text-navy"
                        >
                          Télécharger
                        </a>
                        <button
                          type="button"
                          className="text-xs text-navy"
                          onClick={() => setPending({ type: "restore-server", filename: item.filename })}
                        >
                          Restaurer
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-600"
                          onClick={() => setPending({ type: "delete", filename: item.filename })}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ErrorText message={error} />
      {ok ? <p className="text-sm text-green-700">{ok}</p> : null}

      <ConfirmDialog
        open={Boolean(pending)}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={pending?.type === "delete" ? "Supprimer" : "Restaurer"}
        confirmVariant={pending?.type === "delete" ? "danger" : "danger"}
        busy={busy}
        busyLabel={pending?.type === "delete" ? "Suppression…" : "Restauration…"}
        onCancel={() => {
          if (busy) return;
          setPending(null);
          if (fileRef.current) fileRef.current.value = "";
        }}
        onConfirm={() => void confirmPending()}
      />
    </div>
  );
}
