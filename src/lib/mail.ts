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
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost!,
    port: settings.smtpPort || 587,
    secure: (settings.smtpPort || 587) === 465,
    auth: { user: settings.smtpUser!, pass: settings.smtpPass || "" },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
  await transporter.sendMail({
    from: settings.smtpFrom || settings.smtpUser || undefined,
    replyTo: settings.smtpReplyTo || undefined,
    to: options.to,
    cc: options.cc || undefined,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments,
  });
}
