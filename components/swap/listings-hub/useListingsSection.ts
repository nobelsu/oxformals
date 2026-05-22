"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  DEFAULT_LISTINGS_SECTION,
  parseListingsSection,
  type ListingsSection,
} from "./types";

export function useListingsSection() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const section = useMemo(
    () => parseListingsSection(searchParams.get("section")),
    [searchParams],
  );

  const setSection = useCallback(
    (next: ListingsSection) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "requests");
      if (next === DEFAULT_LISTINGS_SECTION) {
        params.delete("section");
      } else {
        params.set("section", next);
      }
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [router, searchParams],
  );

  return { section, setSection };
}
