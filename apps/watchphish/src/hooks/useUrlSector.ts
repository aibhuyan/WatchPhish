import { useCallback, useSyncExternalStore } from "react";

export function useUrlSector() {
  const getSnapshot = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("sector") || "";
  }, []);
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener("popstate", cb);
    return () => window.removeEventListener("popstate", cb);
  }, []);
  const sector = useSyncExternalStore(subscribe, getSnapshot);
  const setSector = useCallback((value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set("sector", value);
    } else {
      params.delete("sector");
    }
    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.pushState(null, "", newUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);
  return [sector, setSector] as const;
}
