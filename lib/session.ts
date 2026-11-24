import { createHmac, timingSafeEqual } from "node:crypto";

export const sessionCookieName = "food_tracker_session";
const sessionMaxAge = 7 * 24 * 60 * 60;

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: sessionMaxAge,
};

export function createSession(userId: string): string {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SESSION_SECRET must be at least 32 characters.");
  }

  const expiresAt = Date.now() + sessionMaxAge * 1000;
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return payload + "." + signature;
}

export function readSession(cookie: string | undefined): string | null {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!cookie || !secret || secret.length < 32) return null;

  const [payload, signature, extra] = cookie.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(createHmac("sha256", secret).update(payload).digest("base64url"));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const { userId, expiresAt } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof userId === "string" && userId && typeof expiresAt === "number" && expiresAt > Date.now()
      ? userId
      : null;
  } catch {
    return null;
  }
}
