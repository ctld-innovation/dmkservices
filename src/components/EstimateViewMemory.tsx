"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentProps, type MouseEvent } from "react";
import { estimateHref, rememberEstimateView, type EstimateViewMode } from "@/lib/estimateView";

export function EstimateViewTracker({ id, mode }: { id: string; mode: EstimateViewMode }) {
  rememberEstimateView(id, mode);
  useEffect(() => {
    rememberEstimateView(id, mode);
  }, [id, mode]);
  return null;
}

export function EstimateLink({
  id,
  className,
  children,
  onClick,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { id: string }) {
  const router = useRouter();
  const fallback = `/estimates/${id}`;
  const [href, setHref] = useState(fallback);
  useEffect(() => {
    setHref(estimateHref(id));
  }, [id]);

  function go(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const next = estimateHref(id);
    if (next === href) return;
    event.preventDefault();
    router.push(next);
  }

  return (
    <Link href={href} className={className} onClick={go} {...props}>
      {children}
    </Link>
  );
}
