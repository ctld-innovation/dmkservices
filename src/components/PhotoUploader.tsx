"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function PhotoUploader({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onChange() {
    const files = inputRef.current?.files;
    if (!files?.length) return;
    setBusy(true);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    await fetch(`/api/vehicles/${vehicleId}/photos`, { method: "POST", body: fd });
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onChange} />
      <Button type="button" variant="ghost" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? "Téléversement…" : "Ajouter des photos"}
      </Button>
    </div>
  );
}

export function DeletePhotoButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
      onClick={async () => {
        await fetch(`/api/photos/${id}`, { method: "DELETE" });
        router.refresh();
      }}
    >
      Supprimer
    </button>
  );
}
