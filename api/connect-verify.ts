import { jwtVerify } from "jose";
import type { VercelRequest } from "@vercel/node";

const JWT_ISSUER = "tokensmart-connect";
const JWT_AUDIENCE = "tokensmart-partner";

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
    return null;
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

