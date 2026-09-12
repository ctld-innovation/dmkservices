"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function SearchCombo({
  value,
  onChange,
  options,
  placeholder,
  required,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  id?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const query = value;
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = q ? options.filter((item) => item.toLowerCase().includes(q)) : options;
    return list.slice(0, 80);
  }, [options, q]);
  const exact = options.some((item) => item.toLowerCase() === q);
  const canCreate = q.length > 0 && !exact;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [q]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  const items = canCreate ? [`__create__:${query.trim()}`, ...filtered] : filtered;

  return (
    <div ref={rootRef} className="combo">
      <input
        id={id}
        className="input"
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
            setOpen(true);
            return;
          }
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((i) => Math.min(i + 1, items.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((i) => Math.max(i - 1, 0));
          }
          if (e.key === "Enter" && open && items[highlight]) {
            e.preventDefault();
            const item = items[highlight];
            choose(item.startsWith("__create__:") ? item.slice(11) : item);
          }
        }}
      />
      {open ? (
        <ul className="combo-list" role="listbox">
          {items.length === 0 ? (
            <li className="combo-empty">Aucun résultat — saisissez un nouveau nom</li>
          ) : (
            items.map((item, index) => {
              const create = item.startsWith("__create__:");
              const label = create ? item.slice(11) : item;
              return (
                <li key={item}>
                  <button
                    type="button"
                    className={cn("combo-item", index === highlight && "is-active")}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => choose(label)}
                  >
                    {create ? (
                      <>
                        Ajouter « {label} »
                      </>
                    ) : (
                      label
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
