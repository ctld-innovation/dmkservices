"use client";

import { useState, type ReactNode } from "react";
import { VehicleForm, type VehicleFormClient } from "@/components/VehicleForm";
import { Card } from "@/components/ui";

export function ClientVehiclesCard({
  clientId,
  clients,
  canWrite,
  children,
}: {
  clientId: string;
  clients: VehicleFormClient[];
  canWrite: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
        <h2 className="font-semibold text-navy">Véhicules liés</h2>
        {canWrite && !open ? (
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
            Ajouter un véhicule
          </button>
        ) : null}
      </div>
      {children}
      {canWrite && open ? (
        <div className="border-t border-line p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-navy">Nouveau véhicule</h3>
            <button type="button" className="text-sm text-slate-500 hover:text-navy" onClick={() => setOpen(false)}>
              Fermer
            </button>
          </div>
          <VehicleForm
            clients={clients}
            lockToClientId={clientId}
            redirectTo={`/clients/${clientId}`}
            onCancel={() => setOpen(false)}
            compact
          />
        </div>
      ) : null}
    </Card>
  );
}
