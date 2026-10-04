"use client";

import { createContext, useCallback, useContext, useEffect, useState, useMemo } from "react";
import {
  translations,
  interpolate,
  DEFAULT_LOCALE,
  type Locale,
} from "@/lib/i18n/translations";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const STORAGE_KEY = "cud-locale";

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "sw") return stored;
  } catch {
    /* ignore */
  }
  // Browser language detection
  const nav = window.navigator.language?.toLowerCase() ?? "";
  if (nav.startsWith("sw")) return "sw";
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // Initialise synchronously when on client; SSR returns default
    if (typeof window !== "undefined") {
      return detectInitialLocale();
    }
    return DEFAULT_LOCALE;
  });

  // Sync <html lang=""> whenever locale changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    // Update <html lang="">
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const dict = translations[locale] ?? translations[DEFAULT_LOCALE];
      const template = dict[key] ?? translations[DEFAULT_LOCALE][key] ?? key;
      return interpolate(template, params);
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
