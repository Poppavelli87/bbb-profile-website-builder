import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "bbb_admin_session";
const SESSION_WINDOW_MS = 12 * 60 * 60 * 1000;

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "";
}

function sign(value: string): string {
  return createHmac("sha256", adminPassword()).update(value).digest("hex");
}

function safeCompare(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) return false;
  return timingSafeEqual(leftBuf, rightBuf);
}

export function adminAuthRequired(): boolean {
  return Boolean(adminPassword());
}

export function verifyAdminPassword(input: string): boolean {
  if (!adminAuthRequired()) return true;
  return safeCompare(input, adminPassword());
}

export function createAdminSessionToken(now = Date.now()): string {
  const expires = String(now + SESSION_WINDOW_MS);
  const signature = sign(expires);
  return `${expires}.${signature}`;
}

export function verifyAdminSessionToken(token: string, now = Date.now()): boolean {
  if (!adminAuthRequired()) return true;
  const [expiresRaw, signature] = token.split(".");
  if (!expiresRaw || !signature) return false;
  const expires = Number.parseInt(expiresRaw, 10);
  if (!Number.isFinite(expires) || expires < now) return false;
  const expected = sign(expiresRaw);
  return safeCompare(signature, expected);
}

export function requestHasAdminSession(request: NextRequest): boolean {
  if (!adminAuthRequired()) return true;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  return verifyAdminSessionToken(token);
}
