"use client";

import { Chip } from "@/components/ui/Chip";
import { COLLEGE_FILTER_HIGHLIGHTS } from "@/lib/data/colleges";

type Props = {
  active: string | null;
  onChange: (college: string | null) => void;
  availableColleges?: string[];
};

export function CollegeFilter({ active, onChange, availableColleges }: Props) {
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
    <div className="flex flex-wrap gap-2 justify-center">
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
