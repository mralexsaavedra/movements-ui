import type { Dictionary } from "./dictionaries/en";

export type Language = "es" | "en";

export interface I18n {
  readonly language: Language;
  /** BCP 47 locale used by `Intl` for numbers, currencies and dates (`es-ES`, `en-US`). */
  readonly locale: string;
  /** IANA zone that decides calendar days (`Europe/Madrid`); follows the device. */
  readonly timeZone: string;
  /** Typed UI copy for `language`: `t.movements.attention`. */
  readonly t: Dictionary;
}

export type { Dictionary };
