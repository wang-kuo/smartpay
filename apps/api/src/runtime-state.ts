import postgres from "postgres";
import type { DemoSystemLogRecord, DemoUserRecord } from "@smartpay/contracts";
import { getDemoAdminEmail } from "./auth";

type VerificationRecord = {
  code: string;
  expiresAt: string;
};

type UserRow = {
  email: string;
  username: string;
  role: "user" | "admin";
  status: "invited" | "active";
  invite_code: string | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
};

type LogRow = {
  id: string;
  trace_id: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  user_email: string | null;
  payload: Record<string, unknown>;
  redacted: boolean;
  created_at: Date;
};

const testUsers = new Map<string, DemoUserRecord>();
const testVerificationCodes = new Map<string, VerificationRecord[]>();
const testLogs: DemoSystemLogRecord[] = [];

let sqlClient: postgres.Sql | undefined;

function sql(): postgres.Sql {
  sqlClient ??= postgres(process.env.DATABASE_URL ?? "postgres://smartpay:smartpay@localhost:5432/smartpay");
  return sqlClient;
}

function useTestStore(): boolean {
  return process.env.NODE_ENV === "test";
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function defaultUsername(email: string): string {
  return email.split("@")[0] || email;
}

function createInviteCode(email: string): string {
  const prefix = email.split("@")[0]?.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase() || "USER";
  return `INV-${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
}

function createVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function toUserRecord(row: UserRow): DemoUserRecord {
  return {
    email: row.email,
    username: row.username,
    role: row.role,
    status: row.status,
    ...(row.invite_code ? { inviteCode: row.invite_code } : {}),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lastLoginAt: row.last_login_at?.toISOString() ?? null
  };
}

function toLogRecord(row: LogRow): DemoSystemLogRecord {
  return {
    logId: row.id,
    traceId: row.trace_id,
    level: row.level,
    source: row.source,
    message: row.message,
    userEmail: row.user_email,
    payload: row.payload,
    redacted: row.redacted,
    createdAt: row.created_at.toISOString()
  };
}

async function ensureSeededAdmin(): Promise<DemoUserRecord> {
  const email = normalizeEmail(getDemoAdminEmail());
  if (useTestStore()) {
    const existing = testUsers.get(email);
    if (existing) {
      return existing;
    }

    const timestamp = nowIso();
    const admin: DemoUserRecord = {
      email,
      username: "wangkuo0606",
      role: "admin",
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastLoginAt: null
    };
    testUsers.set(email, admin);
    return admin;
  }

  const [row] = await sql()<UserRow[]>`
    insert into users (email, username, role, status, profile)
    values (${email}, 'wangkuo0606', 'admin', 'active', '{}'::jsonb)
    on conflict (email) do update set role = 'admin', status = 'active', updated_at = now()
    returning email, username, role, status, invite_code, created_at, updated_at, last_login_at
  `;
  if (!row) {
    throw new Error("Failed to seed admin user.");
  }
  return toUserRecord(row);
}

export async function getUsers(): Promise<DemoUserRecord[]> {
  await ensureSeededAdmin();
  if (useTestStore()) {
    return [...testUsers.values()].sort((a, b) => a.email.localeCompare(b.email));
  }

  const rows = await sql()<UserRow[]>`
    select email, username, role, status, invite_code, created_at, updated_at, last_login_at
    from users
    order by email asc
  `;
  return rows.map(toUserRecord);
}

export async function requestInvite(emailInput: string): Promise<DemoUserRecord> {
  await ensureSeededAdmin();
  const email = normalizeEmail(emailInput);
  if (useTestStore()) {
    const existing = testUsers.get(email);
    if (existing) {
      return existing;
    }

    const timestamp = nowIso();
    const user: DemoUserRecord = {
      email,
      username: defaultUsername(email),
      role: "user",
      status: "invited",
      inviteCode: createInviteCode(email),
      createdAt: timestamp,
      updatedAt: timestamp,
      lastLoginAt: null
    };
    testUsers.set(email, user);
    return user;
  }

  const [row] = await sql()<UserRow[]>`
    insert into users (email, username, role, status, invite_code, profile)
    values (${email}, ${defaultUsername(email)}, 'user', 'invited', ${createInviteCode(email)}, '{}'::jsonb)
    on conflict (email) do update set updated_at = now()
    returning email, username, role, status, invite_code, created_at, updated_at, last_login_at
  `;
  if (!row) {
    throw new Error("Failed to request invite.");
  }
  return toUserRecord(row);
}

export async function issueEmailCode(
  emailInput: string,
  inviteCode?: string
): Promise<VerificationRecord | undefined> {
  const admin = await ensureSeededAdmin();
  const email = normalizeEmail(emailInput);

  if (useTestStore()) {
    let user = testUsers.get(email);
    if (!user && inviteCode) {
      user = await requestInvite(email);
    }
    if (!user || (user.email !== admin.email && user.status === "invited" && user.inviteCode !== inviteCode)) {
      return undefined;
    }
    const record = { code: createVerificationCode(), expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() };
    testVerificationCodes.set(email, [...(testVerificationCodes.get(email) ?? []), record]);
    return record;
  }

  const [user] = await sql()<UserRow[]>`
    select email, username, role, status, invite_code, created_at, updated_at, last_login_at
    from users
    where email = ${email}
    limit 1
  `;
  if (!user || (user.email !== admin.email && user.status === "invited" && user.invite_code !== inviteCode)) {
    return undefined;
  }

  const code = createVerificationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await sql()`
    update users
    set verification_code = ${code}, verification_expires_at = ${expiresAt}, updated_at = now()
    where email = ${email}
  `;
  return { code, expiresAt: expiresAt.toISOString() };
}

export async function verifyEmailSession(
  emailInput: string,
  verificationCode: string,
  username?: string
): Promise<DemoUserRecord | undefined> {
  const email = normalizeEmail(emailInput);
  if (useTestStore()) {
    const user = testUsers.get(email);
    const records = testVerificationCodes.get(email) ?? [];
    const verification = records.find((record) => record.code === verificationCode);
    if (!user || !verification || Date.parse(verification.expiresAt) < Date.now()) {
      return undefined;
    }

    const updated = {
      ...user,
      username: username?.trim() || user.username,
      status: "active" as const,
      inviteCode: undefined,
      updatedAt: nowIso(),
      lastLoginAt: nowIso()
    };
    testUsers.set(email, updated);
    testVerificationCodes.set(email, records.filter((record) => record.code !== verificationCode));
    return updated;
  }

  const [row] = await sql()<UserRow[]>`
    update users
    set username = coalesce(nullif(${username?.trim() ?? ""}, ''), username),
        status = 'active',
        invite_code = null,
        verification_code = null,
        verification_expires_at = null,
        last_login_at = now(),
        updated_at = now()
    where email = ${email}
      and verification_code = ${verificationCode}
      and verification_expires_at >= now()
    returning email, username, role, status, invite_code, created_at, updated_at, last_login_at
  `;
  return row ? toUserRecord(row) : undefined;
}

export async function addSystemLog(input: {
  traceId: string;
  level: DemoSystemLogRecord["level"];
  source: string;
  message: string;
  userEmail?: string | null;
  payload?: Record<string, unknown>;
  redacted?: boolean;
}): Promise<DemoSystemLogRecord> {
  const log: DemoSystemLogRecord = {
    logId: `log_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    traceId: input.traceId,
    level: input.level,
    source: input.source,
    message: input.message,
    userEmail: input.userEmail ?? null,
    payload: input.payload ?? {},
    redacted: input.redacted ?? false,
    createdAt: nowIso()
  };

  if (useTestStore()) {
    testLogs.unshift(log);
    testLogs.splice(250);
    return log;
  }

  const db = sql();
  const [row] = await db<LogRow[]>`
    insert into system_log (id, trace_id, level, source, message, user_email, payload, redacted)
    values (${log.logId}, ${log.traceId}, ${log.level}, ${log.source}, ${log.message}, ${log.userEmail}, ${JSON.stringify(log.payload)}::jsonb, ${log.redacted})
    returning id, trace_id, level, source, message, user_email, payload, redacted, created_at
  `;
  if (!row) {
    throw new Error("Failed to write system log.");
  }
  return toLogRecord(row);
}

export async function getSystemLogs(): Promise<DemoSystemLogRecord[]> {
  await ensureSeededAdmin();
  if (useTestStore()) {
    return testLogs;
  }

  const rows = await sql()<LogRow[]>`
    select id, trace_id, level, source, message, user_email, payload, redacted, created_at
    from system_log
    order by created_at desc
    limit 250
  `;
  return rows.map(toLogRecord);
}

export function getLatestVerificationCodeForTest(emailInput: string): string | undefined {
  if (!useTestStore()) {
    return undefined;
  }

  return testVerificationCodes.get(normalizeEmail(emailInput))?.at(-1)?.code;
}

export function getInviteCodeForTest(emailInput: string): string | undefined {
  if (!useTestStore()) {
    return undefined;
  }

  return testUsers.get(normalizeEmail(emailInput))?.inviteCode;
}
