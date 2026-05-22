"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { collegeToSlug } from "@/lib/data/collegeSlug";
import {
  DEFAULT_COLLEGE_PAGE_SECTION,
  parseCollegePageSection,
  type CollegePageSection,
} from "./collegePageTypes";

export function useCollegePageSection(college: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = collegeToSlug(college);

  const section = useMemo(
    () => parseCollegePageSection(searchParams.get("section")),
    [searchParams],
  );

  const setSection = useCallback(
    (next: CollegePageSection) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === DEFAULT_COLLEGE_PAGE_SECTION) {
        params.delete("section");
      } else {
        params.set("section", next);
      }
      const qs = params.toString();
      const path = `/college/${slug}${qs ? `?${qs}` : ""}`;
      router.replace(path, { scroll: false });
    },
    [router, searchParams, slug],
  );

  return { section, setSection };
}
