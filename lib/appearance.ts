/**
 * Appearance choices saved on this device (not the account): colour scheme,
 * font and text size. Each is a `data-*` attribute on <html> that globals.css
 * keys off; the default value is "no attribute".
 */
export const APPEARANCE_PREFS = {
  theme: {
    key: "oxformals-appearance",
    attr: "data-theme",
    fallback: "system",
    values: ["system", "light", "dark"],
  },
  font: {
    key: "oxformals-font",
    attr: "data-font",
    fallback: "default",
    values: ["default", "simple", "serif", "system"],
  },
  textSize: {
    key: "oxformals-text-size",
    attr: "data-text-size",
    fallback: "default",
    values: ["small", "default", "large", "xlarge"],
  },
} as const;

export type AppearancePref = keyof typeof APPEARANCE_PREFS;
export type AppearanceValue<P extends AppearancePref> =
  (typeof APPEARANCE_PREFS)[P]["values"][number];

export type Appearance = AppearanceValue<"theme">;
export type FontChoice = AppearanceValue<"font">;
export type TextSize = AppearanceValue<"textSize">;

/**
 * Runs before first paint (app/layout.tsx) so saved choices never flash the
 * defaults. Generated from the table above, so it can't drift from the hook.
 */
export const APPEARANCE_BOOT_SCRIPT = `try{${Object.values(APPEARANCE_PREFS)
  .map(
    (p) =>
      `var v=localStorage.getItem(${JSON.stringify(p.key)});if(${JSON.stringify(
        p.values.filter((x) => x !== p.fallback),
      )}.indexOf(v)>-1)document.documentElement.setAttribute(${JSON.stringify(p.attr)},v);`,
  )
  .join("")}}catch(e){}`;
