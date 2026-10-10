export interface CountForms {
  readonly one: string;
  readonly other: string;
}

/**
 * Picks the singular or plural copy and fills `{count}` with the number in `locale`. Both UI
 * languages (es, en) only distinguish one/other for whole numbers, so this avoids
 * `Intl.PluralRules`, whose support varies across JS engines; switch to it when adding a language
 * with more plural categories.
 */
export const formatCount = (forms: CountForms, count: number, locale: string): string =>
  (count === 1 ? forms.one : forms.other).replace(
    "{count}",
    new Intl.NumberFormat(locale).format(count),
  );
