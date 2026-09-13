"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { ROLES } from "@/lib/constants";
import { Button, ErrorText, Field, Input, Select } from "@/components/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { SessionUser } from "@/lib/auth";

export type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  active: boolean;
};

type EditTarget = { kind: "profile" } | { kind: "user"; user: UserRow };

export function UsersSettings({
  users,
  isAdmin,
  currentUser,
}: {
  users: UserRow[];
  isAdmin: boolean;
  currentUser: SessionUser;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [resetting, setResetting] = useState(false);

  function flash(message: string) {
    setOk(message);
    setError(null);
  }

  async function createUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        role: form.get("role"),
        password: form.get("password"),
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else {
      (e.target as HTMLFormElement).reset();
      flash("Utilisateur créé");
      router.refresh();
    }
  }

  async function toggleUser(id: string, active: boolean) {
    setError(null);
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error || "Mise à jour impossible");
    else router.refresh();
  }

  async function saveUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const id = editing.kind === "profile" ? currentUser.id : editing.user.id;
    const payload: Record<string, unknown> = {
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      email: form.get("email"),
    };
    const password = String(form.get("password") || "");
    if (password) payload.password = password;
    if (isAdmin && editing.kind === "user") {
      payload.role = form.get("role");
      payload.active = form.get("active") === "true";
    }
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Enregistrement impossible");
      return;
    }
    setEditing(null);
    flash("Profil enregistré");
    router.refresh();
  }

  async function sendReset() {
    if (!resetUser) return;
    setResetting(true);
    setError(null);
    const res = await fetch(`/api/users/${resetUser.id}/reset-password`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setResetting(false);
    setResetUser(null);
    if (!res.ok) setError(data.error || "Envoi impossible");
    else flash(`Lien de réinitialisation envoyé à ${resetUser.email}`);
  }

  const editValues =
    editing?.kind === "profile"
      ? currentUser
      : editing?.kind === "user"
        ? editing.user
        : null;

  return (
    <div className="space-y-4">
      <ErrorText message={error} />
      {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}

      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-navy">Mon profil</h2>
            <p className="text-sm text-slate-500">Prénom, nom, email et mot de passe.</p>
          </div>
          <Button type="button" variant="ghost" onClick={() => setEditing({ kind: "profile" })}>
            Modifier
          </Button>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-navy/50">Nom</dt>
            <dd>
              {currentUser.firstName} {currentUser.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-navy/50">Email</dt>
            <dd>{currentUser.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-navy/50">Rôle</dt>
            <dd>{ROLES.find((r) => r.value === currentUser.role)?.label}</dd>
          </div>
        </dl>
      </div>

      {isAdmin ? (
        <>
          <form onSubmit={createUser} className="card grid gap-3 p-6 sm:grid-cols-2">
            <h2 className="font-semibold text-navy sm:col-span-2">Nouvel utilisateur</h2>
            <Field label="Prénom">
              <Input name="firstName" required />
            </Field>
            <Field label="Nom">
              <Input name="lastName" required />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" required />
            </Field>
            <Field label="Mot de passe">
              <Input name="password" type="password" required minLength={8} />
            </Field>
            <Field label="Rôle">
              <Select name="role" defaultValue="ESTIMATOR">
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <Button type="submit">Créer l&apos;utilisateur</Button>
            </div>
          </form>
          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Actif</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.firstName} {u.lastName}
                    </td>
                    <td>{u.email}</td>
                    <td>{ROLES.find((r) => r.value === u.role)?.label}</td>
                    <td>{u.active ? "Oui" : "Non"}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setEditing({ kind: "user", user: u })}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={!u.active}
                          onClick={() => setResetUser(u)}
                        >
                          Reset MDP
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => toggleUser(u.id, u.active)}
                        >
                          {u.active ? "Désactiver" : "Activer"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {editing && editValues ? (
        <div className="modal-overlay" role="presentation" onClick={() => !saving && setEditing(null)}>
          <form
            role="dialog"
            aria-modal="true"
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveUser}
          >
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-lg font-semibold text-navy">
                {editing.kind === "profile" ? "Modifier mon profil" : "Modifier l'utilisateur"}
              </h2>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <Field label="Prénom">
                <Input name="firstName" required defaultValue={editValues.firstName} />
              </Field>
              <Field label="Nom">
                <Input name="lastName" required defaultValue={editValues.lastName} />
              </Field>
              <Field label="Email">
                <Input name="email" type="email" required defaultValue={editValues.email} />
              </Field>
              <Field label="Nouveau mot de passe" hint="Laisser vide pour ne pas changer">
                <Input name="password" type="password" minLength={8} autoComplete="new-password" />
              </Field>
              {isAdmin && editing.kind === "user" ? (
                <>
                  <Field label="Rôle">
                    <Select name="role" defaultValue={editing.user.role}>
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Statut">
                    <Select name="active" defaultValue={editing.user.active ? "true" : "false"}>
                      <option value="true">Actif</option>
                      <option value="false">Inactif</option>
                    </Select>
                  </Field>
                </>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(resetUser)}
        title="Envoyer un lien de réinitialisation ?"
        message={
          resetUser
            ? `Un email sera envoyé à ${resetUser.email} avec un lien valable 2 heures.`
            : ""
        }
        confirmLabel="Envoyer"
        busyLabel="Envoi…"
        confirmVariant="primary"
        busy={resetting}
        onCancel={() => !resetting && setResetUser(null)}
        onConfirm={() => void sendReset()}
      />
    </div>
  );
}
