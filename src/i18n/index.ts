import en from "./en";
import es from "./es";
import pt from "./pt";
import hi from "./hi";
import fr from "./fr";
import de from "./de";

export type Locale = "en" | "es" | "pt" | "hi" | "fr" | "de";
export const locales: Locale[] = ["en", "es", "pt", "hi", "fr", "de"];
export const defaultLocale: Locale = "en";

const dictionaries = { en, es, pt, hi, fr, de } as const;

export type Dictionary = typeof en;

export function useTranslations(locale: Locale): Dictionary {
  return dictionaries[locale] || dictionaries[defaultLocale];
}

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function getLocaleFromPathname(pathname: string): Locale {
  const match = pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//);
  if (match && isValidLocale(match[1])) {
    return match[1];
  }
  return defaultLocale;
}

export function getLocalePrefix(locale: Locale): string {
  return locale === defaultLocale ? "" : `/${locale}`;
}

export function getLocalizedPath(targetLocale: Locale, currentPath: string): string {
  const stripped = currentPath.replace(/^\/(en|es|pt|hi|fr|de)(\/|$)/, "/$2");
  return getLocalePrefix(targetLocale) + stripped;
}

export function getAlternateLinks(locale: Locale, path: string): { lang: string; href: string }[] {
  return locales.map((l) => ({
    lang: l,
    href: `https://quickjpgconverter.com${getLocalePrefix(l)}${path}`,
  }));
}

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  hi: "हिन्दी",
  fr: "Français",
  de: "Deutsch",
};

export const localeFlags: Record<Locale, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  pt: "🇧🇷",
  hi: "🇮🇳",
  fr: "🇫🇷",
  de: "🇩🇪",
};
