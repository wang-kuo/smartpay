import { getSecret } from "./secrets";
import nodemailer from "nodemailer";

export type EmailDeliveryResult =
  | { sent: true }
  | { sent: false; reason: "email_delivery_not_configured" };

function isEmailDeliveryConfigured(): boolean {
  return Boolean(
    getSecret("EMAIL_DELIVERY_MODE") === "json" ||
      (getSecret("SMTP_HOST")?.trim() && getSecret("SMTP_FROM")?.trim())
  );
}

function getSmtpPort(): number {
  const parsed = Number(getSecret("SMTP_PORT") ?? "587");
  return Number.isFinite(parsed) ? parsed : 587;
}

async function sendMail(input: { to: string; subject: string; text: string }): Promise<EmailDeliveryResult> {
  const host = getSecret("SMTP_HOST")?.trim();
  const from = getSecret("SMTP_FROM")?.trim();
  if (getSecret("EMAIL_DELIVERY_MODE") === "json") {
    const transporter = nodemailer.createTransport({ jsonTransport: true });
    await transporter.sendMail({
      from: from || "no-reply@smartpay.local",
      to: input.to,
      subject: input.subject,
      text: input.text
    });
    return { sent: true };
  }

  if (!host || !from) {
    return { sent: false, reason: "email_delivery_not_configured" };
  }

  const user = getSecret("SMTP_USER")?.trim();
  const pass = getSecret("SMTP_PASS")?.trim();
  const transporter = nodemailer.createTransport({
    host,
    port: getSmtpPort(),
    secure: getSmtpPort() === 465,
    auth: user && pass ? { user, pass } : undefined
  });

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text
  });
  return { sent: true };
}

export async function sendInviteEmail(input: {
  email: string;
  inviteCode: string;
}): Promise<EmailDeliveryResult> {
  if (!isEmailDeliveryConfigured()) {
    return { sent: false, reason: "email_delivery_not_configured" };
  }

  return sendMail({
    to: input.email,
    subject: "Your SmartPay invite code",
    text: `Your SmartPay invite code is ${input.inviteCode}.`
  });
}

export async function sendVerificationEmail(input: {
  email: string;
  verificationCode: string;
  expiresAt: string;
}): Promise<EmailDeliveryResult> {
  if (!isEmailDeliveryConfigured()) {
    return { sent: false, reason: "email_delivery_not_configured" };
  }

  return sendMail({
    to: input.email,
    subject: "Your SmartPay verification code",
    text: `Your SmartPay verification code is ${input.verificationCode}. It expires at ${input.expiresAt}.`
  });
}
