"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorText } from "@/components/ui";
import {
  DEFAULT_EXPLODED_COLORS,
  EXPLODED_KIND_LABELS,
  EXPLODED_PANEL_KINDS,
  explodedKindStyles,
  parseExplodedColors,
  type ExplodedColors,
  type ExplodedPanelKind,
} from "@/lib/explodedStyles";

export function ExplodedColorsSettings({
  initial,
  isAdmin,
}: {
  initial: unknown;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [colors, setColors] = useState<ExplodedColors>(() => parseExplodedColors(initial));
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = explodedKindStyles(colors);

  function setKind(kind: ExplodedPanelKind, hex: string) {
    setColors((prev) => ({ ...prev, [kind]: hex }));
    setOk(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ explodedColors: parseExplodedColors(colors) }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Enregistrement impossible");
      return;
    }
    setColors(parseExplodedColors(data.explodedColors ?? colors));
    setOk("Couleurs de l’éclaté enregistrées");
    router.refresh();
  }

  return (
    <form className="mt-8 border-t border-line pt-6" onSubmit={onSubmit}>
      <h3 className="mb-1 font-semibold text-navy">Couleurs de l’éclaté</h3>
      <p className="mb-4 text-sm text-slate-500">
        Ces couleurs s’affichent sur le schéma, l’impression et les PDF.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {EXPLODED_PANEL_KINDS.map((kind) => {
          const style = preview[kind];
          return (
            <label key={kind} className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(colors[kind]) ? colors[kind] : DEFAULT_EXPLODED_COLORS[kind]}
                onChange={(e) => setKind(kind, e.target.value)}
                disabled={!isAdmin}
                className="h-9 w-9 cursor-pointer rounded border border-line bg-white p-0"
                aria-label={EXPLODED_KIND_LABELS[kind]}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-navy">{EXPLODED_KIND_LABELS[kind]}</span>
                <input
                  type="text"
                  value={colors[kind]}
                  onChange={(e) => setKind(kind, e.target.value)}
                  disabled={!isAdmin}
                  className="mt-0.5 w-24 border-0 bg-transparent p-0 font-mono text-xs uppercase text-slate-500 outline-none"
                />
              </span>
              <span
                className="h-6 w-6 shrink-0 rounded-sm border"
                style={{ background: style.fill, borderColor: style.stroke }}
                aria-hidden
              />
            </label>
          );
        })}
      </div>
      <ErrorText message={error} />
      {ok ? <p className="mt-2 text-sm text-green-700">{ok}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" disabled={!isAdmin || busy}>
          {busy ? "Enregistrement…" : isAdmin ? "Enregistrer les couleurs" : "Réservé à l'administrateur"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={!isAdmin || busy}
          onClick={() => {
            setColors({ ...DEFAULT_EXPLODED_COLORS });
            setOk(null);
          }}
        >
          Couleurs par défaut
        </Button>
      </div>
    </form>
  );
}
