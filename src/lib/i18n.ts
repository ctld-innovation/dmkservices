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
      collapse: "Replier le menu",
      expand: "Déplier le menu",
    },
    login: {
      title: "Connexion",
      email: "Email",
      password: "Mot de passe",
      submit: "Se connecter",
      loading: "Connexion…",
      error: "Connexion impossible",
      forgot: "Mot de passe oublié ?",
      forgotTitle: "Réinitialiser le mot de passe",
      forgotHelp: "Saisissez votre email. Si un compte existe, un lien de réinitialisation vous sera envoyé.",
      forgotSubmit: "Envoyer le lien",
      forgotSending: "Envoi…",
      forgotSent: "Si un compte correspond à cet email, un lien a été envoyé.",
      backToLogin: "Retour à la connexion",
      resetTitle: "Nouveau mot de passe",
      resetSubmit: "Enregistrer le mot de passe",
      resetSaving: "Enregistrement…",
      resetSuccess: "Mot de passe mis à jour. Vous pouvez vous connecter.",
      resetInvalid: "Ce lien est invalide ou a expiré.",
      confirmPassword: "Confirmer le mot de passe",
      passwordMismatch: "Les mots de passe ne correspondent pas",
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
      collapse: "Collapse menu",
      expand: "Expand menu",
    },
    login: {
      title: "Sign in",
      email: "Email",
      password: "Password",
      submit: "Sign in",
      loading: "Signing in…",
      error: "Unable to sign in",
      forgot: "Forgot password?",
      forgotTitle: "Reset your password",
      forgotHelp: "Enter your email. If an account exists, a reset link will be sent.",
      forgotSubmit: "Send reset link",
      forgotSending: "Sending…",
      forgotSent: "If an account matches this email, a link has been sent.",
      backToLogin: "Back to sign in",
      resetTitle: "New password",
      resetSubmit: "Save password",
      resetSaving: "Saving…",
      resetSuccess: "Password updated. You can sign in.",
      resetInvalid: "This link is invalid or has expired.",
      confirmPassword: "Confirm password",
      passwordMismatch: "Passwords do not match",
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
