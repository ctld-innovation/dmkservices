import nodemailer from "nodemailer";
import type { CompanySettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function loadCompanySettings() {
  return prisma.companySettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", name: "DMK Services" },
  });
}

export function smtpConfigured(settings: Pick<CompanySettings, "smtpHost" | "smtpUser">) {
  return Boolean(settings.smtpHost && settings.smtpUser);
}

export function requestOrigin(req: Request) {
  const env = process.env.APP_URL?.replace(/\/$/, "");
  if (env) return env;
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

function emailDomain(address: string) {
  return address.split("@")[1]?.toLowerCase() ?? "";
}

function parseMailAddress(raw: string | null | undefined): { name?: string; address?: string } {
  if (!raw?.trim()) return {};
  const value = raw.trim();
  const angled = value.match(/^(.*)<\s*([^>]+)\s*>$/);
  if (angled) {
    const name = angled[1].trim().replace(/^["']|["']$/g, "");
    return { name: name || undefined, address: angled[2].trim() };
  }
  if (value.includes("@")) return { address: value };
  return { name: value };
}

function formatFrom(name: string | undefined, address: string) {
  const safeName = (name || "").replace(/[\r\n"]/g, "").trim();
  return safeName ? `"${safeName}" <${address}>` : address;
}

/** Compte SMTP = enveloppe. Un autre From n'est accepté que sur le même domaine. */
export function resolveMailIdentities(settings: CompanySettings) {
  const smtpUser = (settings.smtpUser || "").trim();
  const parsed = parseMailAddress(settings.smtpFrom);
  const name = parsed.name || settings.name || "DMK Services";
  const requested = parsed.address?.trim();
  const sameDomain = Boolean(
    requested && smtpUser && emailDomain(requested) === emailDomain(smtpUser),
  );
  const fromAddress = sameDomain && requested ? requested : smtpUser;
  const replyTo =
    settings.smtpReplyTo?.trim() ||
    (!sameDomain && requested && requested.toLowerCase() !== smtpUser.toLowerCase()
      ? requested
      : undefined);
  return {
    from: formatFrom(name, fromAddress),
    envelopeFrom: smtpUser,
    replyTo,
  };
}

export function smtpErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/auth|invalid login|credentials|535/i.test(message)) {
    return "Authentification SMTP refusée. Vérifiez l'utilisateur et le mot de passe.";
  }
  if (/sender|from address|not allowed|not owned|not permitted|550/i.test(message)) {
    return "Le serveur SMTP refuse cet expéditeur. L'expéditeur doit être le compte SMTP ou un alias autorisé du même domaine. Pour une autre boîte, utilisez « Répondre à ».";
  }
  return `Envoi impossible : ${message}`;
}

export async function sendCompanyMail(
  settings: CompanySettings,
  options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    cc?: string;
    attachments?: Array<{ filename: string; content: Buffer }>;
  },
) {
  if (!smtpConfigured(settings)) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }
  const identities = resolveMailIdentities(settings);
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost!,
    port: settings.smtpPort || 587,
    secure: (settings.smtpPort || 587) === 465,
    auth: { user: settings.smtpUser!, pass: settings.smtpPass || "" },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
  const payload = {
    envelope: identities.envelopeFrom ? { from: identities.envelopeFrom } : undefined,
    replyTo: identities.replyTo,
    to: options.to,
    cc: options.cc || undefined,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments,
  };
  try {
    await transporter.sendMail({ ...payload, from: identities.from });
  } catch (error) {
    const fallbackFrom = formatFrom(parseMailAddress(settings.smtpFrom).name || settings.name, settings.smtpUser!);
    if (identities.from === fallbackFrom) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (!/sender|from address|not allowed|not owned|not permitted|550/i.test(message)) throw error;
    await transporter.sendMail({ ...payload, from: fallbackFrom });
  }
}
