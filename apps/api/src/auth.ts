import type { Context } from "hono";
import { getSecret } from "./secrets";

export const ADMIN_TOKEN_HEADER = "X-Demo-Admin-Token";

export function getDemoAdminEmail(): string {
  return getSecret("DEMO_ADMIN_EMAIL")?.trim().toLowerCase() || "admin@smartpay.local";
}

export function getDemoAdminPassword(): string | undefined {
  return getSecret("DEMO_ADMIN_PASSWORD")?.trim();
}

export function getDemoAdminToken(): string | undefined {
  return getSecret("DEMO_ADMIN_TOKEN")?.trim();
}

export function isAdminCredentials(email: string, password: string | undefined): boolean {
  const expectedPassword = getDemoAdminPassword();
  return Boolean(
    expectedPassword &&
      password &&
      email.trim().toLowerCase() === getDemoAdminEmail() &&
      password === expectedPassword
  );
}

export function isAdminRequest(context: Context): boolean {
  const expectedToken = getDemoAdminToken();
  return Boolean(expectedToken && context.req.header(ADMIN_TOKEN_HEADER) === expectedToken);
}
