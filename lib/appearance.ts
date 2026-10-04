export type Appearance = "system" | "light" | "dark";

export const APPEARANCE_KEY = "oxformals-appearance";

/**
 * Runs before first paint (app/layout.tsx) so a saved choice never flashes the
 * other palette. Keep in step with applyAppearance in lib/hooks/useAppearance.ts.
 */
export const APPEARANCE_BOOT_SCRIPT = `try{var a=localStorage.getItem("${APPEARANCE_KEY}");if(a==="light"||a==="dark")document.documentElement.setAttribute("data-theme",a)}catch(e){}`;
