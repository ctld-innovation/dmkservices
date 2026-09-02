export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "dmk_locale";

const dictionaries = {
  fr: {
    appName: "DMK Services",
    tagline: "Débosselage & grêle",
    nav: {
      dashboard: "Tableau de bord",
      clients: "Clients",
      vehicles: "Véhicules",
      estimates: "Devis",
      settings: "Paramètres",
      logout: "Déconnexion",
    },
    login: {
      title: "Connexion",
      email: "Email",
      password: "Mot de passe",
      submit: "Se connecter",
      loading: "Connexion…",
      error: "Connexion impossible",
    },
  },
  en: {
    appName: "DMK Services",
    tagline: "Dent & hail repair",
    nav: {
      dashboard: "Dashboard",
      clients: "Clients",
      vehicles: "Vehicles",
      estimates: "Estimates",
      settings: "Settings",
      logout: "Sign out",
    },
    login: {
      title: "Sign in",
      email: "Email",
      password: "Password",
      submit: "Sign in",
      loading: "Signing in…",
      error: "Unable to sign in",
    },
  },
} as const;

export type Messages = (typeof dictionaries)[Locale];

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "fr" || value === "en";
}

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}

export function localeFromCookie(value?: string | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
