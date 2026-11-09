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

export type Dictionary = Record<string, any>;

export function useTranslations(locale: Locale): Dictionary {
  return (dictionaries[locale] || dictionaries[defaultLocale]) as Dictionary;
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
  // Strip any leading locale prefix like /es/, /de/, etc.
  const stripped = currentPath.replace(/^\/(en|es|pt|hi|fr|de)(\/|$)/, "/$2");
  const normalized = stripped.replace(/\/$/, "");

  // If switching to English, the full English route exists
  if (targetLocale === defaultLocale) {
    return stripped === "" ? "/" : (stripped.endsWith("/") ? stripped : `${stripped}/`);
  }

  // If the route exists across all localized sites, navigate directly to it
  if (multilingualRoutes.has(normalized)) {
    const slashPath = normalized === "" ? "/" : `${normalized}/`;
    return `${getLocalePrefix(targetLocale)}${slashPath}`;
  }

  // For subpages without a 1:1 translation yet, safely route to the locale's homepage
  // This guarantees zero 404s for both visitors and search engine bots
  return `${getLocalePrefix(targetLocale)}/`;
}

// Routes that exist across all supported locales
export const multilingualRoutes = new Set([
  "",
  "/",
  "/about",
  "/passport-photo-size",
  "/jpg-to-png",
  "/compress-to-100kb",
]);

export function getAlternateLinks(locale: Locale, path: string): { lang: string; href: string }[] {
  const normalized = path.replace(/\/$/, "");
  if (!multilingualRoutes.has(normalized)) {
    // English-only page: return empty array to prevent emitting broken hreflang tags to 404 pages
    return [];
  }

  const slashPath = normalized === "" ? "/" : `${normalized}/`;

  return locales.map((l) => ({
    lang: l,
    href: `https://quickjpgconverter.com${getLocalePrefix(l)}${slashPath}`,
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
