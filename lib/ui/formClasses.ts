/** Shared outline field styles (profile, listings, browse, chat). */
export const OUTLINE_FIELD_CLS =
  "w-full min-w-0 rounded-full border-[2px] border-[var(--ink)] bg-[var(--bg)] text-[var(--ink)] placeholder:text-[var(--ink-soft)] px-4 py-2 text-base focus:outline-none focus:border-[var(--accent-hover)]";

export const OUTLINE_SEARCH_FIELD_CLS = `${OUTLINE_FIELD_CLS} shadow-[0_0_0_0_transparent] transition-[border-color,box-shadow] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_52%,transparent)]`;
