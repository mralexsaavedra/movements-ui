import { use } from "react";

import type { I18n } from "./I18n";
import { I18nContext } from "./I18nContext";

export function useI18n(): I18n {
  const i18n = use(I18nContext);
  if (!i18n) throw new Error("useI18n must be used within an I18nProvider");
  return i18n;
}
