"use client";

import { Chip } from "@/components/ui/Chip";
import { COLLEGE_FILTER_HIGHLIGHTS } from "@/lib/data/colleges";

export const MY_FORMALS_SENTINEL = "my-formals" as const;

type Props = {
  active: string | null;
  onChange: (college: string | null) => void;
  availableColleges?: string[];
  wishlist?: string[];
  isAuthenticated?: boolean;
  className?: string;
};

export function CollegeFilter({
  active,
  onChange,
  availableColleges,
  wishlist = [],
  isAuthenticated = false,
  className = "",
}: Props) {
  const showMyFormals = isAuthenticated && wishlist.length > 0;

  const colleges = availableColleges ?? [];
  const highlighted = COLLEGE_FILTER_HIGHLIGHTS.filter((c) =>
    colleges.includes(c),
  );
  const others = colleges
    .filter(
      (c) =>
        !COLLEGE_FILTER_HIGHLIGHTS.includes(
          c as (typeof COLLEGE_FILTER_HIGHLIGHTS)[number],
        ),
    )
    .sort();
  const chips = [...highlighted, ...others];

  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {showMyFormals && (
        <Chip
          variant={active === MY_FORMALS_SENTINEL ? "filled" : "outline"}
          onClick={() => onChange(MY_FORMALS_SENTINEL)}
        >
          My formals
        </Chip>
      )}
      <Chip
        variant={active === null ? "filled" : "outline"}
        onClick={() => onChange(null)}
      >
        All colleges
      </Chip>
      {chips.map((c) => (
        <Chip
          key={c}
          variant={active === c ? "filled" : "outline"}
          onClick={() => onChange(c)}
        >
          {c}
        </Chip>
      ))}
    </div>
  );
}
