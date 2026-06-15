// 관리자 세션 — 환경변수 자격증명 검증 + HMAC 서명 쿠키 (Web Crypto, Edge/Node 공용)

export const COOKIE_NAME = "admin_session";
export const MAX_AGE = 60 * 60 * 8; // 8시간(초)

const encoder = new TextEncoder();

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET 환경변수가 설정되지 않았습니다.");
  return s;
}

function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): string {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return atob(b64);
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return toBase64Url(new Uint8Array(sig));
}

export async function createSessionToken(username: string): Promise<string> {
  const payload = toBase64Url(
    encoder.encode(JSON.stringify({ u: username, exp: Date.now() + MAX_AGE * 1000 })),
  );
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  if ((await hmac(payload)) !== sig) return false;
  try {
    const data = JSON.parse(fromBase64Url(payload));
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function verifyCredentials(username: string, password: string): boolean {
  const u = process.env.ADMIN_USERNAME;
  const p = process.env.ADMIN_PASSWORD;
  return Boolean(u && p) && username === u && password === p;
}
