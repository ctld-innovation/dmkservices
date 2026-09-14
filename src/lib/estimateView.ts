const MODE_KEY = "dmk:estimate-view:";

export type EstimateViewMode = "edit" | "view";

export function estimateViewStorageKey(id: string) {
  return `${MODE_KEY}${id}`;
}

export function rememberEstimateView(id: string, mode: EstimateViewMode) {
  if (typeof window === "undefined" || !id) return;
  sessionStorage.setItem(estimateViewStorageKey(id), mode);
}

export function lastEstimateView(id: string): EstimateViewMode {
  if (typeof window === "undefined" || !id) return "view";
  return sessionStorage.getItem(estimateViewStorageKey(id)) === "edit" ? "edit" : "view";
}

export function estimateHref(id: string, mode = lastEstimateView(id)) {
  return mode === "edit" ? `/estimates/${id}/edit` : `/estimates/${id}`;
}
