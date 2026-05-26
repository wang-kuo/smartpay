import type { Context } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSecret } from "./secrets";

export const ADMIN_TOKEN_HEADER = "X-Demo-Admin-Token";

type AdminSessionPayload = {
  email: string;
  role: "admin";
  exp: number;
};

export function getDemoAdminEmail(): string {
  return getSecret("DEMO_ADMIN_EMAIL")?.trim().toLowerCase() || "wangkuo0606@gmail.com";
}

function getSessionSecret(): string {
  return getSecret("AUTH_SESSION_SECRET")?.trim() || "smartpay-local-session-secret";
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");
}

export function createAdminSessionToken(email: string, now = Date.now()): string {
  const payload: AdminSessionPayload = {
    email: email.trim().toLowerCase(),
    role: "admin",
    exp: now + 24 * 60 * 60 * 1000
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

function verifyAdminSessionToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<AdminSessionPayload>;
    return (
      payload.email === getDemoAdminEmail() &&
      payload.role === "admin" &&
      typeof payload.exp === "number" &&
      payload.exp > Date.now()
    );
  } catch {
    return false;
  }
}

export function isAdminRequest(context: Context): boolean {
  return verifyAdminSessionToken(context.req.header(ADMIN_TOKEN_HEADER));
}
