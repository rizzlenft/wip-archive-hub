import { jwtVerify } from "jose";
import type { VercelRequest } from "@vercel/node";

const JWT_ISSUER = "tokensmart-connect";
const JWT_AUDIENCE = "tokensmart-partner";
const TOKENSMART_URL =
  process.env.TOKENSMART_URL ||
  process.env.NEXT_PUBLIC_TOKENSMART_URL ||
  "https://www.tokensmart.co";

function getJwtKey() {
  const secret = process.env.CONNECT_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "CONNECT_JWT_SECRET must be set and at least 32 characters",
    );
  }
  return new TextEncoder().encode(secret);
}

export type ConnectUserPayload = {
  sub: string;
  email?: string;
  client_id?: string;
  scope?: string;
};

type TokenSmartUser = {
  sub?: unknown;
  id?: unknown;
  user_id?: unknown;
  email?: unknown;
  client_id?: unknown;
  scope?: unknown;
};

function normalizeTokenSmartUser(user: TokenSmartUser | null | undefined) {
  if (!user) return null;

  const sub =
    typeof user.sub === "string"
      ? user.sub
      : typeof user.id === "string"
        ? user.id
        : typeof user.user_id === "string"
          ? user.user_id
          : null;

  if (!sub) return null;

  return {
    sub,
    email: typeof user.email === "string" ? user.email : undefined,
    client_id: typeof user.client_id === "string" ? user.client_id : undefined,
    scope: typeof user.scope === "string" ? user.scope : undefined,
  } satisfies ConnectUserPayload;
}

async function verifyViaTokenSmart(
  token: string,
): Promise<ConnectUserPayload | null> {
  try {
    const res = await fetch(`${TOKENSMART_URL}/api/connect/user-events`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as { user?: TokenSmartUser };
    return normalizeTokenSmartUser(data.user);
  } catch {
    return null;
  }
}

export async function verifyConnectJwt(
  token: string,
): Promise<ConnectUserPayload | null> {
  try {
    const key = getJwtKey();
    const { payload } = await jwtVerify(token, key, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: payload.email as string | undefined,
      client_id: (payload.client_id as string | undefined) ?? "",
      scope: payload.scope as string | undefined,
    };
  } catch {
    return verifyViaTokenSmart(token);
  }
}

export async function getConnectUserFromRequest(
  req: VercelRequest,
): Promise<ConnectUserPayload | null> {
  const cookieHeader = req.headers.cookie ?? "";
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((part) => {
    const [name, ...rest] = part.split("=");
    if (!name || !rest.length) return;
    cookies[name.trim()] = decodeURIComponent(rest.join("="));
  });
  const token = cookies.jwt;
  if (!token) return null;
  return verifyConnectJwt(token);
}

